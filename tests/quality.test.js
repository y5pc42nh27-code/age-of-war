import test from "node:test";
import assert from "node:assert/strict";
import { AdaptiveQuality, initialQuality, PROFILES } from "../src/quality.js";
test("quality defaults preserve desktop detail and bound mobile work", () => {
  assert.equal(initialQuality(), "high");
  assert.equal(initialQuality({ mobile: true, cores: 6 }), "balanced");
  assert.equal(initialQuality({ mobile: true, cores: 4 }), "low");
  assert.ok(PROFILES.low.effects < PROFILES.high.effects);
  assert.equal(PROFILES.balanced.fps, 30);
});
test("sustained slow painting adapts down without oscillating or changing simulation", () => {
  const q = new AdaptiveQuality();
  for (let i = 0; i < 90; i++) q.sample(30);
  assert.equal(q.key, "balanced");
  for (let i = 0; i < 90; i++) q.sample(40);
  assert.equal(q.key, "low");
  for (let i = 0; i < 200; i++) q.sample(0.5);
  assert.equal(q.key, "low");
  assert.equal(q.changes, 2);
});
test("manual quality selection is retained; automatic selection resets sampling", () => {
  const q = new AdaptiveQuality({ mobile: true, cores: 4 });
  q.choose("high");
  for (let i = 0; i < 180; i++) q.sample(80);
  assert.equal(q.key, "high");
  q.choose("auto");
  assert.equal(q.key, "low");
  assert.equal(q.automatic, true);
});
test("sustained frame cadence stalls trigger automatic fallback even with fast drawing", () => {
  const q = new AdaptiveQuality();
  for (let i = 0; i < 90; i++) q.sample(0.5, 40);
  assert.equal(q.key, "balanced");
});
