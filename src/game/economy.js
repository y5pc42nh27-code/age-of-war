export function passiveIncome(side) {
  return 7 + side.era * 1.25 + side.economy * 2.5;
}
export function rewardKill(side, unit) {
  side.money = Math.min(2500, side.money + unit.cost * 0.32);
  side.xp += 9 + unit.era * 2;
  side.kills++;
}
export function economyCost(side) {
  return 180 + side.economy * 150;
}
export function makeSide(id) {
  return {
    id,
    era: 0,
    money: 290,
    xp: 0,
    hp: 6000,
    maxHp: 6000,
    queue: [],
    defenses: [],
    specialCd: 0,
    ewCd: 0,
    jam: 0,
    recon: 0,
    reconCd: 0,
    economy: 0,
    cover: false,
    kills: 0,
    spent: 0,
    damage: 0,
    evolvedAt: 0,
  };
}
