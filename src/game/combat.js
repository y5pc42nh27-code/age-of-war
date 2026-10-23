import { ASSAULT } from "./orders.js";
import { damageAgainst, WORLD } from "./data.js";
export function damageUnit(sim, unit, damage, source) {
  if (unit.hp <= 0) return;
  const side = sim.sides[unit.side];
  const protectedByCover =
    side.cover && (unit.side === 0 ? unit.x < 410 : unit.x > 1190);
  unit.hp -= damage * (protectedByCover ? 0.78 : 1) * (side.assault>0?ASSAULT.incoming:1);
  unit.hit = 0.18;
  if (unit.hp <= 0) {
    unit.state = "dead";
    sim.onKill(source, unit);
  }
}
export function updateCombat(sim, dt) {
  const alive = sim.units
    .filter((u) => u.hp > 0)
    .sort((a, b) =>
      a.side === b.side
        ? a.side === 0
          ? b.x - a.x
          : a.x - b.x
        : a.side - b.side,
    );
  for (const u of alive) {
    if (u.hp <= 0) continue;
    u.age += dt;
    u.hit = Math.max(0, u.hit - dt);
    u.attack = Math.max(0, u.attack - dt);
    u.cooldown -= dt;
    const dir = u.side === 0 ? 1 : -1,
      enemySide = sim.sides[1 - u.side];
    let target = null,
      dist = Infinity;
    for (const v of alive) {
      if (v.side === u.side || v.hp <= 0) continue;
      const d = (v.x - u.x) * dir;
      if (d >= -16 && d < dist) {
        target = v;
        dist = d;
      }
    }
    const baseDistance = u.side === 0 ? WORLD - 100 - u.x : u.x - 100;
    if (!target || dist > baseDistance) {
      target = null;
      dist = baseDistance;
    }
    if (dist <= u.range + 18) {
      u.state = "attack";
      if (u.cooldown <= 0) {
        u.cooldown = u.interval;
        u.attack = 0.24;
        const jammed = u.cls === "drone" && sim.sides[u.side].jam > 0;
        if (!jammed) {
          const escalation = (1 + Math.max(0, sim.time - 600) / 900) * (sim.sides[u.side].assault>0?ASSAULT.damage:1);
          if (target) {
            const amount = damageAgainst(
              u,
              target,
              escalation * (sim.sides[u.side].recon > 0 ? 1.2 : 1),
            );
            damageUnit(sim, target, amount, u.side);
            if (u.cls === "siege")
              for (const v of alive) {
                if (
                  v.id !== target.id &&
                  v.side !== u.side &&
                  Math.abs(v.x - target.x) < 54
                )
                  damageUnit(sim, v, amount * 0.38, u.side);
              }
          } else {
            const amount =
              u.damage * (u.cls === "siege" ? 3.2 : 0.8) * escalation;
            enemySide.hp = Math.max(0, enemySide.hp - amount);
            sim.sides[u.side].damage += amount;
            sim.emit("base-hit", { side: 1 - u.side });
          }
          sim.emit("shot", {
            x: u.x,
            to: target?.x ?? (u.side === 0 ? 1500 : 100),
            side: u.side,
            weapon: u.weapon,
            era: u.era,
          });
        }
      }
    } else {
      let step = u.speed * dt * (sim.sides[u.side].assault>0?ASSAULT.speed:1);
      for (const friend of alive) {
        if (friend.side !== u.side || friend.id === u.id || friend.hp <= 0)
          continue;
        const gap = (friend.x - u.x) * dir;
        const spacing = u.radius + friend.radius + 1;
        if (gap > 0 && gap < spacing + 7) step = Math.min(step, Math.max(0, gap - spacing));
      }
      step = Math.min(step, Math.max(0, dist - 28));
      u.x += dir * step;
      u.state = step > 0 ? "march" : "idle";
    }
  }
}
