import test from "node:test";
import assert from "node:assert/strict";
import { FramePacer } from "../src/render/pacing.js";
test("30 FPS pacing carries fractional rAF time instead of falling to 20 FPS", () => {
  const p = new FramePacer();
  let frames = 0,
    elapsed = 0;
  for (let i = 0; i < 600; i++) {
    const dt = p.advance(16.666, 30);
    if (dt) {
      frames++;
      elapsed += dt;
    }
  }
  assert.ok(frames >= 299 && frames <= 301);
  assert.ok(Math.abs(elapsed - 10000) < 34);
});
test("60 FPS presentation preserves desktop cadence", () => {
  const p = new FramePacer();
  let frames = 0,
    elapsed = 0;
  for (let i = 0; i < 600; i++) {
    const dt = p.advance(16.666, 60);
    if (dt) {
      frames++;
      elapsed += dt;
    }
  }
  assert.equal(frames, 600);
  assert.ok(Math.abs(elapsed - 10000) < 1);
});
test("presentation quality switches and slow rendering do not duplicate simulation time", () => {
  const p = new FramePacer();
  let elapsed = 0;
  for (let i = 0; i < 120; i++) elapsed += p.advance(16.666, 30);
  for (let i = 0; i < 120; i++) elapsed += p.advance(16.666, 60);
  assert.ok(Math.abs(elapsed - 4000) < 34);
  const slow = new FramePacer();
  let total = 0;
  for (let i = 0; i < 40; i++) total += slow.advance(50, 30);
  assert.equal(total, 2000);
});
