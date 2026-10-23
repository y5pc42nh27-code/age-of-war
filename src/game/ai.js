import { repairCost } from "./orders.js";
import { DIFFICULTIES, ERAS, unitStats, MAX_UNITS } from "./data.js";
export function updateAI(sim, sideId, dt) {
  sim.aiTimers[sideId] -= dt;
  if (sim.aiTimers[sideId] > 0) return;
  const profile = DIFFICULTIES[sim.difficulty];
  sim.aiTimers[sideId] = profile.decision * (0.85 + sim.random() * 0.3);
  const side = sim.sides[sideId],
    enemy = sim.sides[1 - sideId];
  const foes = sim.units.filter((u) => u.side !== sideId && u.hp > 0),
    own = sim.units.filter((u) => u.side === sideId && u.hp > 0);
  const threatened = foes.some((u) => (sideId === 0 ? u.x < 440 : u.x > 1160));
  if (
    side.xp >= ERAS[side.era].xp &&
    side.era < 7 &&
    (own.length >= 2 || !threatened)
  ) {
    sim.evolve(sideId);
    return;
  }
  if(side.hp<side.maxHp*0.45 && side.repairEra!==side.era && side.money>repairCost(side)+130)sim.repair(sideId);
  if(own.length>=4 && foes.length>=2 && side.assaultCd<=0 && side.money>300 && own.some(u=>Math.abs(u.x-800)<250))sim.assault(sideId);
  if (side.era === 7) {
    if (foes.some((u) => u.cls === "drone")) sim.jam(sideId);
    if (foes.length > 2) sim.scout(sideId);
  }
  if (
    (foes.length >= 4 || threatened) &&
    side.specialCd <= 0 &&
    (sim.difficulty !== "easy" || sim.random() > 0.55)
  )
    sim.special(sideId);
  if (
    threatened &&
    !side.cover &&
    side.hp < side.maxHp * 0.65 &&
    side.money > 300
  ) {
    sim.cover(sideId);
    return;
  }
  if (threatened && side.defenses.length < 2 && side.money > 450) {
    sim.build(
      sideId,
      side.era === 7 && foes.some((u) => u.cls === "drone") ? 1 : 0,
    );
    return;
  }
  if (side.economy < 3 && side.money > 500 && !threatened) {
    sim.upgradeEconomy(sideId);
    return;
  }
  if (own.length + side.queue.length >= MAX_UNITS || side.queue.length >= 4)
    return;
  let slot = 0;
  if (sim.difficulty === "easy") slot = Math.floor(sim.random() * 3);
  else {
    const counts = { infantry: 0, ranged: 0, heavy: 0, siege: 0, drone: 0 };
    for (const f of foes) counts[f.cls]++;
    slot =
      counts.heavy > counts.infantry
        ? 0
        : counts.infantry > counts.ranged
          ? 1
          : counts.ranged > 1
            ? 2
            : Math.floor(sim.random() * 3);
    if (own.filter((u) => u.slot === 0).length < 2) slot = 0;
    if (own.length > 5 && enemy.hp < enemy.maxHp * 0.6) slot = 2;
  }
  if (side.money >= unitStats(side.era, slot).cost) sim.recruit(sideId, slot);
}
