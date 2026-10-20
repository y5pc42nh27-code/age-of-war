import {
  ERAS,
  DIFFICULTIES,
  unitStats,
  defenseStats,
  MAX_UNITS,
} from "./data.js";
import { makeSide, passiveIncome, rewardKill, economyCost } from "./economy.js";
import { createUnit } from "./units.js";
import { updateCombat, damageUnit } from "./combat.js";
import { updateAI } from "./ai.js";
export class Simulation {
  constructor({ difficulty = "normal", seed = 42, autoplay = false } = {}) {
    this.difficulty = difficulty;
    this.seed = seed;
    this.autoplay = autoplay;
    this.sides = [makeSide(0), makeSide(1)];
    this.units = [];
    this.time = 0;
    this.nextId = 1;
    this.events = [];
    this.aiTimers = [0, 1];
    this.paused = false;
    this.result = null;
    this.recruited = 0;
    this.lastError = "";
    this.specials = [];
  }
  random() {
    this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  emit(type, data = {}) {
    if (this.events.length < 240) this.events.push({ type, ...data });
  }
  fail(text) {
    this.lastError = text;
    return false;
  }
  recruit(id, slot) {
    const s = this.sides[id],
      stats = unitStats(s.era, slot);
    if (this.result) return false;
    if (s.queue.length >= 5)
      return this.fail("Kolejka rekrutacji pełna (maksymalnie 5).");
    if (
      this.units.filter((u) => u.side === id && u.hp > 0).length +
        s.queue.length >=
      MAX_UNITS
    )
      return this.fail("Limit armii: 28 jednostek.");
    if (s.money < stats.cost)
      return this.fail(`Brakuje ${Math.ceil(stats.cost - s.money)} monet.`);
    s.money -= stats.cost;
    s.spent += stats.cost;
    s.queue.push({
      era: s.era,
      slot,
      remaining: stats.training,
      total: stats.training,
    });
    if (id === 0) this.recruited++;
    this.emit("recruit", { side: id });
    return true;
  }
  evolve(id) {
    const s = this.sides[id],
      cost = ERAS[s.era].xp;
    if (s.era === 7) return this.fail("Osiągnięto ostatnią epokę.");
    if (s.xp < cost)
      return this.fail(`Potrzeba jeszcze ${Math.ceil(cost - s.xp)} XP.`);
    s.xp -= cost;
    s.era++;
    s.maxHp += 650;
    s.hp = Math.min(s.maxHp, s.hp + 900);
    s.evolvedAt = this.time;
    this.emit("evolve", { side: id, era: s.era });
    return true;
  }
  build(id, type) {
    const s = this.sides[id],
      d = defenseStats(s.era, type);
    if (s.defenses.length >= 2)
      return this.fail("Oba stanowiska obronne są zajęte.");
    if (s.money < d.cost) return this.fail(`Obrona kosztuje ${d.cost} monet.`);
    s.money -= d.cost;
    s.defenses.push({ ...d, type, era: s.era, cooldown: 1 });
    this.emit("build", { side: id });
    return true;
  }
  salvage(id, index) {
    const s = this.sides[id],
      d = s.defenses[index];
    if (!d) return this.fail("Puste stanowisko.");
    s.money += Math.round(d.cost * 0.4);
    s.defenses.splice(index, 1);
    return true;
  }
  upgradeEconomy(id) {
    const s = this.sides[id],
      cost = economyCost(s);
    if (s.economy >= 3) return this.fail("Maksymalny poziom zaopatrzenia.");
    if (s.money < cost)
      return this.fail(`Rozwój zaopatrzenia kosztuje ${cost} monet.`);
    s.money -= cost;
    s.economy++;
    return true;
  }
  cover(id) {
    const s = this.sides[id];
    if (s.cover) return this.fail("Osłony są już zbudowane.");
    if (s.money < 180) return this.fail("Osłony kosztują 180 monet.");
    s.money -= 180;
    s.cover = true;
    return true;
  }
  special(id) {
    const s = this.sides[id];
    if (s.specialCd > 0)
      return this.fail(`Atak dostępny za ${Math.ceil(s.specialCd)} s.`);
    const foes = this.units.filter((u) => u.side !== id && u.hp > 0);
    if (!foes.length) return this.fail("Brak wrogich jednostek w polu.");
    const target = foes.reduce((a, b) =>
      foes.filter((u) => Math.abs(u.x - b.x) < 160).length >
      foes.filter((u) => Math.abs(u.x - a.x) < 160).length
        ? b
        : a,
    );
    s.specialCd = 55;
    this.specials.push({ side: id, x: target.x, era: s.era, remaining: 1.6 });
    this.emit("special", { side: id, x: target.x, era: s.era });
    return true;
  }
  jam(id) {
    const s = this.sides[id];
    if (s.era < 7)
      return this.fail("Walka elektroniczna wymaga współczesności.");
    if (s.ewCd > 0)
      return this.fail(`Zakłócanie dostępne za ${Math.ceil(s.ewCd)} s.`);
    s.ewCd = 38;
    this.sides[1 - id].jam = 12;
    this.emit("jam", { side: id });
    return true;
  }
  scout(id) {
    const s = this.sides[id];
    if (s.era < 7)
      return this.fail("Rozpoznanie dronem wymaga współczesności.");
    if (s.reconCd > 0)
      return this.fail(`Rozpoznanie dostępne za ${Math.ceil(s.reconCd)} s.`);
    s.reconCd = 45;
    s.recon = 14;
    this.emit("scout", { side: id });
    return true;
  }
  onKill(side, unit) {
    rewardKill(this.sides[side], unit);
    this.emit("death", {
      x: unit.x,
      side: unit.side,
      era: unit.era,
      weapon: unit.weapon,
    });
  }
  tick(dt) {
    if (this.paused || this.result) return;
    dt = Math.min(dt, 0.1);
    this.time += dt;
    for (const s of this.sides) {
      s.money = Math.min(
        2500,
        s.money +
          passiveIncome(s) *
            dt *
            (s.id === 1 ? DIFFICULTIES[this.difficulty].income : 1),
      );
      s.xp += dt * 1.65;
      for (const key of ["specialCd", "ewCd", "jam", "recon", "reconCd"])
        s[key] = Math.max(0, s[key] - dt);
      if (s.queue.length) {
        s.queue[0].remaining -= dt;
        if (s.queue[0].remaining <= 0) {
          const q = s.queue.shift();
          this.units.push(createUnit(s.id, q.era, q.slot, this.nextId++));
        }
      }
      for (const d of s.defenses) {
        d.cooldown -= dt;
        const x = s.id === 0 ? 108 : 1492;
        const target = this.units
          .filter(
            (u) => u.side !== s.id && u.hp > 0 && Math.abs(u.x - x) < d.range,
          )
          .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
        if (target && d.cooldown <= 0) {
          d.cooldown = d.interval;
          const antiDrone = d.era === 7 && d.type === 1;
          damageUnit(
            this,
            target,
            d.damage * (antiDrone ? (target.cls === "drone" ? 3 : 0.65) : 1),
            s.id,
          );
          this.emit("shot", {
            x,
            to: target.x,
            side: s.id,
            weapon: d.type ? "rifle" : "cannon",
            era: d.era,
          });
        }
      }
    }
    for (const attack of this.specials) {
      attack.remaining -= dt;
      if (attack.remaining <= 0) {
        const s = this.sides[attack.side],
          jammed = attack.era === 7 && s.jam > 0;
        for (const u of this.units) {
          if (
            u.side !== attack.side &&
            u.hp > 0 &&
            Math.abs(u.x - attack.x) < 180
          )
            damageUnit(
              this,
              u,
              185 * 1.24 ** attack.era * (jammed ? 0.3 : 1),
              attack.side,
            );
        }
        this.emit("impact", { x: attack.x, era: attack.era });
      }
    }
    this.specials = this.specials.filter((s) => s.remaining > 0);
    if (this.autoplay) updateAI(this, 0, dt);
    updateAI(this, 1, dt);
    updateCombat(this, dt);
    // A prolonged siege disrupts supply lines. Central control becomes decisive.
    if (this.time > 720) {
      for (const side of this.sides) {
        const pressure = this.units
          .filter((u) => u.side !== side.id && u.hp > 0)
          .reduce((sum, u) => {
            const penetration =
              side.id === 0 ? (940 - u.x) / 400 : (u.x - 660) / 400;
            return (
              sum +
              Math.max(0, Math.min(1.8, penetration)) *
                (u.cls === "siege" ? 2 : 1)
            );
          }, 0);
        const loss = (1 + pressure * 0.2) * (6 + (this.time - 720) / 30) * dt;
        side.hp = Math.max(0, side.hp - loss);
        this.sides[1 - side.id].damage += loss;
      }
    }
    this.units = this.units.filter((u) => u.hp > 0);
    if (this.sides.some((s) => s.hp <= 0)) {
      this.result = this.sides[1].hp <= 0 ? "victory" : "defeat";
      this.emit("end", { result: this.result });
    }
  }
}
