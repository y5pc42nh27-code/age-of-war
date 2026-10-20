import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation.js";
import {
  ERAS,
  unitStats,
  damageAgainst,
  defenseStats,
  MAX_UNITS,
} from "../src/game/data.js";
import { createUnit } from "../src/game/units.js";
import { economyCost } from "../src/game/economy.js";
function advance(sim, seconds) {
  for (let n = 0; n < Math.ceil(seconds * 10); n++) {
    sim.tick(0.1);
    sim.events = [];
  }
}
function isolated() {
  const sim = new Simulation();
  sim.aiTimers = [Infinity, Infinity];
  return sim;
}

test("eight eras, 24 unique units, two appropriate defenses and a special per era", () => {
  assert.equal(ERAS.length, 8);
  assert.equal(new Set(ERAS.flatMap((e) => e.units)).size, 24);
  for (let era = 0; era < 8; era++) {
    assert.equal(ERAS[era].defense.length, 2);
    assert.ok(ERAS[era].special);
    for (let slot = 0; slot < 3; slot++) {
      const u = unitStats(era, slot);
      for (const key of [
        "hp",
        "damage",
        "range",
        "speed",
        "interval",
        "cost",
        "training",
      ])
        assert.ok(u[key] > 0);
    }
  }
});
test("counter triangle has real mathematical impact", () => {
  const i = unitStats(0, 0),
    r = unitStats(0, 1),
    h = unitStats(0, 2);
  assert.ok(damageAgainst(i, h) > i.damage * (1 - h.armor));
  assert.ok(damageAgainst(r, i) > r.damage);
  assert.ok(damageAgainst(h, r) > h.damage);
  assert.ok(
    i.cost / i.damage < h.cost / h.damage,
    "cheap infantry has better raw damage per coin",
  );
});
test("recruitment pays immediately and trains sequentially", () => {
  const sim = isolated(),
    s = sim.sides[0];
  const cost = unitStats(0, 0).cost;
  assert.equal(sim.recruit(0, 0), true);
  assert.equal(s.money, 290 - cost);
  assert.equal(sim.units.length, 0);
  advance(sim, 2);
  assert.equal(sim.units.filter((u) => u.side === 0).length, 1);
  assert.equal(s.queue.length, 0);
});
test("queue, army and money constraints cannot be bypassed", () => {
  const sim = isolated(),
    s = sim.sides[0];
  s.money = 10000;
  for (let i = 0; i < 5; i++) assert.ok(sim.recruit(0, 0));
  assert.equal(sim.recruit(0, 0), false);
  s.queue = [];
  s.money = 0;
  assert.equal(sim.recruit(0, 0), false);
  assert.match(sim.lastError, /Brakuje/);
  s.money = 1000;
  sim.units = Array.from({ length: MAX_UNITS }, (_, id) =>
    createUnit(0, 0, 0, id),
  );
  assert.equal(sim.recruit(0, 0), false);
});
test("combat detects enemies, stops and kills; kill grants XP and coins", () => {
  const sim = isolated();
  sim.units = [createUnit(0, 0, 0, 1), createUnit(1, 0, 1, 2)];
  sim.units[0].x = 780;
  sim.units[1].x = 815;
  const before = sim.sides[0].xp;
  advance(sim, 12);
  assert.equal(sim.sides[0].kills, 1);
  assert.ok(sim.sides[0].xp > before + 12 * 1.65);
  assert.ok(sim.sides[0].money > 290 + 12 * 7);
  assert.ok(sim.units.every((u) => u.hp > 0));
});
test("friendly march preserves spacing", () => {
  const sim = isolated();
  const a = createUnit(0, 0, 2, 1),
    b = createUnit(0, 0, 0, 2);
  a.x = 400;
  b.x = 360;
  sim.units = [a, b];
  advance(sim, 8);
  assert.ok(a.x - b.x >= 22.9);
});
test("vehicle formations preserve their wider silhouettes", () => {
  const sim = isolated();
  const tank = createUnit(0, 7, 2, 1), infantry = createUnit(0, 7, 0, 2);
  tank.x = 450; infantry.x = 380; sim.units = [tank, infantry];
  advance(sim, 8);
  assert.ok(tank.x - infantry.x >= tank.radius + infantry.radius);
});
test("evolution spends growing XP costs, heals base and retains old troops", () => {
  const sim = isolated();
  sim.units = [createUnit(0, 0, 0, 1)];
  assert.equal(sim.evolve(0), false);
  for (let era = 0; era < 7; era++) {
    sim.sides[0].xp = ERAS[era].xp;
    assert.ok(sim.evolve(0));
    assert.equal(sim.sides[0].xp, 0);
  }
  assert.equal(sim.sides[0].era, 7);
  assert.equal(sim.units[0].era, 0);
  assert.equal(sim.evolve(0), false);
});
test("passive income and treasury cap prevent deadlock and inflation", () => {
  const sim = isolated();
  sim.sides[0].money = 0;
  advance(sim, 10);
  assert.ok(Math.abs(sim.sides[0].money - 70) < 0.01);
  sim.sides[0].money = 2499;
  advance(sim, 2);
  assert.equal(sim.sides[0].money, 2500);
});
test("economy upgrades have a finite cost and three-level limit", () => {
  const sim = isolated(),
    s = sim.sides[0];
  s.money = 2500;
  for (let n = 0; n < 3; n++) {
    const before = s.money,
      cost = economyCost(s);
    assert.ok(sim.upgradeEconomy(0));
    assert.equal(s.money, before - cost);
  }
  assert.equal(sim.upgradeEconomy(0), false);
});
test("defenses cost money, fire at enemies, cap at two, and can be salvaged", () => {
  const sim = isolated(),
    s = sim.sides[0];
  s.money = 1500;
  const before = s.money;
  assert.ok(sim.build(0, 1));
  assert.equal(s.money, before - defenseStats(0, 1).cost);
  assert.ok(sim.build(0, 0));
  assert.equal(sim.build(0, 1), false);
  const u = createUnit(1, 0, 0, 2);
  u.x = 230;
  sim.units = [u];
  advance(sim, 2);
  assert.ok(u.hp < u.maxHp);
  assert.ok(sim.salvage(0, 0));
  assert.equal(s.defenses.length, 1);
});
test("terrain cover reduces incoming damage near the base", async () => {
  const { damageUnit } = await import("../src/game/combat.js");
  const sim = isolated(),
    u = createUnit(0, 0, 0, 1);
  sim.units = [u];
  assert.ok(sim.cover(0));
  damageUnit(sim, u, 100, 1);
  assert.equal(u.hp, u.maxHp - 78);
});
test("special attack is delayed, damages a group and respects cooldown", () => {
  const sim = isolated();
  sim.units = [createUnit(1, 0, 2, 2), createUnit(1, 0, 2, 3)];
  sim.units[0].x = 800;
  sim.units[1].x = 835;
  assert.ok(sim.special(0));
  assert.equal(sim.units[0].hp, 350);
  assert.equal(sim.special(0), false);
  advance(sim, 1.8);
  assert.ok(sim.units.every((u) => u.hp < 350));
  assert.ok(sim.sides[0].specialCd > 50);
});
test("pause freezes movement, income, training, cooldowns, AI and clock", () => {
  const sim = new Simulation();
  sim.recruit(0, 0);
  sim.sides[0].specialCd = 20;
  sim.paused = true;
  const snapshot = JSON.stringify({
    sides: sim.sides,
    units: sim.units,
    time: sim.time,
    ai: sim.aiTimers,
  });
  advance(sim, 20);
  assert.equal(
    JSON.stringify({
      sides: sim.sides,
      units: sim.units,
      time: sim.time,
      ai: sim.aiTimers,
    }),
    snapshot,
  );
});
test("modern EW stops drones; recon boosts damage; anti-drone defense is effective", () => {
  const run = (jam) => {
    const sim = isolated();
    sim.sides.forEach((s) => (s.era = 7));
    const drone = createUnit(0, 7, 1, 1),
      target = createUnit(1, 7, 2, 2);
    drone.x = 750;
    target.x = 940;
    target.speed = 0;
    target.cooldown = 100;
    sim.units = [drone, target];
    if (jam) assert.ok(sim.jam(1));
    advance(sim, 1);
    return target.hp;
  };
  assert.ok(run(true) > run(false));
  const reconDamage = (enabled) => {
    const sim = isolated();
    sim.sides[0].era = 7;
    const a = createUnit(0, 7, 0, 1),
      b = createUnit(1, 7, 2, 2);
    a.x = 750;
    b.x = 800;
    b.cooldown = 100;
    sim.units = [a, b];
    if (enabled) sim.scout(0);
    advance(sim, 0.2);
    return b.maxHp - b.hp;
  };
  assert.ok(reconDamage(true) > reconDamage(false) * 1.19);

  const sim = isolated();
  assert.equal(sim.jam(0), false);
  sim.sides[0].era = 7;
  assert.ok(sim.scout(0));
  assert.equal(sim.sides[0].recon, 14);
  assert.equal(sim.scout(0), false);
  sim.sides[0].money = 2500;
  sim.build(0, 1);
  const u = createUnit(1, 7, 1, 1);
  u.x = 300;
  sim.units = [u];
  advance(sim, 1.2);
  assert.ok(u.hp < u.maxHp - defenseStats(7, 1).damage * 2);
});
test("siege pressure breaks late stalemates and central control increases pressure", () => {
  const sim = isolated();
  sim.time = 721;
  const before = sim.sides[0].hp;
  advance(sim, 1);
  assert.ok(sim.sides[0].hp < before);
  const other = isolated();
  other.time = 721;
  const u = createUnit(0, 7, 2, 1);
  u.x = 1000;
  other.units = [u];
  advance(other, 1);
  assert.ok(other.sides[1].hp < other.sides[0].hp);
});
test("both victory and defeat occur from actual attacks on bases", () => {
  for (const side of [0, 1]) {
    const sim = isolated();
    sim.sides[1 - side].hp = 1;
    const u = createUnit(side, 7, 2, 1);
    u.x = side === 0 ? 1460 : 140;
    u.cooldown = 0;
    sim.units = [u];
    advance(sim, 0.2);
    assert.equal(sim.result, side === 0 ? "victory" : "defeat");
  }
});
test("new match has clean state and deterministic replay matches", () => {
  const a = new Simulation({ autoplay: true, seed: 99 }),
    b = new Simulation({ autoplay: true, seed: 99 });
  advance(a, 150);
  advance(b, 150);
  assert.deepEqual(a.sides, b.sides);
  assert.deepEqual(a.units, b.units);
  const clean = new Simulation();
  assert.equal(clean.time, 0);
  assert.equal(clean.sides[0].era, 0);
  assert.equal(clean.result, null);
  assert.equal(clean.units.length, 0);
});
for (const difficulty of ["easy", "normal", "hard"])
  for (const seed of [42, 71, 113])
    test(`AI vs AI: ${difficulty}, seed ${seed}, full match and all eras`, () => {
      const sim = new Simulation({ difficulty, seed, autoplay: true });
      let peak = 0;
      while (!sim.result && sim.time < 1500) {
        sim.tick(0.1);
        sim.events = [];
        peak = Math.max(peak, sim.units.length);
        for (const s of sim.sides) {
          assert.ok(s.money >= -0.00001);
          assert.ok(s.queue.length <= 5);
        }
      }
      assert.ok(sim.result, "must end within 25 minutes");
      assert.ok(
        sim.time >= 900,
        "representative matches should last at least 15 minutes",
      );
      assert.ok(
        sim.sides.every((s) => s.era === 7),
        "both AIs reached era VIII",
      );
      assert.ok(sim.sides.every((s) => s.kills > 30));
      assert.ok(peak <= 56);
    });
