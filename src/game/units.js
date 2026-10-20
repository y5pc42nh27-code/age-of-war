import { unitStats } from "./data.js";
export function createUnit(side, era, slot, id) {
  const stats = unitStats(era, slot);
  return {
    ...stats,
    id,
    side,
    hp: stats.hp,
    maxHp: stats.hp,
    x: side === 0 ? 135 : 1465,
    cooldown: 0.15,
    state: "march",
    phase: id * 1.73,
    hit: 0,
    attack: 0,
    depth: (id % 3) * 7,
    age: 0,
  };
}
