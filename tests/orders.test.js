import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/game/simulation.js';
import {createUnit} from '../src/game/units.js';
import {damageUnit} from '../src/game/combat.js';
import {ASSAULT,repairCost} from '../src/game/orders.js';
function match(){const s=new Simulation();s.aiTimers=[Infinity,Infinity];s.units=[createUnit(0,0,0,1)];return s;}
test('assault charges once, improves march, increases vulnerability and respects pause/cooldown',()=>{
 const s=match(),plain=match();assert.ok(s.assault(0));assert.equal(s.sides[0].money,290-ASSAULT.cost);assert.equal(s.assault(0),false);
 s.tick(.1);plain.tick(.1);assert.ok(s.units[0].x>plain.units[0].x);const hp=s.units[0].hp;damageUnit(s,s.units[0],10,1);assert.ok(Math.abs(s.units[0].hp-(hp-11))<1e-8);
 s.paused=true;const before=[s.sides[0].assault,s.sides[0].assaultCd];s.tick(.1);assert.deepEqual([s.sides[0].assault,s.sides[0].assaultCd],before);assert.equal(s.repair(0),false);
 s.paused=false;for(let i=0;i<81;i++)s.tick(.1);assert.equal(s.sides[0].assault,0);assert.ok(s.sides[0].assaultCd>0);
});
test('repair costs money, cannot overheal and is limited to once per era',()=>{
 const s=match(),p=s.sides[0];assert.equal(s.repair(0),false);assert.equal(p.money,290);p.hp-=1000;assert.ok(s.repair(0));assert.equal(p.hp,5480);assert.equal(p.money,290-repairCost(p));assert.equal(s.repair(0),false);
 p.era=1;p.money=1000;p.hp=p.maxHp-10;assert.ok(s.repair(0));assert.equal(p.hp,p.maxHp);
});
test('assault increases actual combat damage and neither order works after match end',()=>{
 const a=match(),b=match();for(const s of [a,b]){const foe=createUnit(1,0,2,2);s.units[0].x=790;foe.x=820;s.units[0].cooldown=0;s.units.push(foe);}
 a.assault(0);a.tick(.1);b.tick(.1);assert.ok(a.units[1].hp<b.units[1].hp);a.result='victory';assert.equal(a.assault(0),false);assert.equal(a.repair(0),false);
});
