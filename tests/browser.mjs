import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.TEST_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [],
  failed = [],
  remote = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
});
await context.route("**/*", (route) => {
  if (
    !route.request().url().startsWith(base) &&
    !route.request().url().startsWith("data:")
  ) {
    remote.push(route.request().url());
    return route.abort();
  }
  return route.continue();
});
await fs.mkdir("test-results", { recursive: true });
const check = (name) => console.log(`PASS ${name}`);
try {
  await page.goto(base);
  await page.waitForFunction(() => window.bloodlines?.renderer.scene.ready);
  assert.ok(await page.locator("#start").isVisible());
  await page.click('[data-difficulty="hard"]');
  assert.ok(
    await page
      .locator("#difficulty-description")
      .textContent()
      .then((t) => t.includes("+12%")),
  );
  await page.click("#menu-help");
  await page.click("#help-close");
  assert.ok(await page.locator("#start").isVisible());
  check("menu, difficulty persistence and help return");
  await page.screenshot({ path: "test-results/menu.png" });
  await page.click("#start");
  await page.click("#history");
  await page.click("#history-close");
  await page.keyboard.press("1");
  await page.click('[data-recruit="1"]');
  assert.equal(
    await page.evaluate(() => window.bloodlines.simulation.recruited),
    2,
  );
  await page.click('[data-recruit="2"]', { force: true });
  assert.match(await page.locator("#toast").textContent(), /Brakuje/);
  check("mouse/keyboard recruitment, queue, disabled-action explanation");
  await page.waitForTimeout(5200);
  assert.ok(
    await page.evaluate(
      () =>
        window.bloodlines.simulation.units.filter((u) => u.side === 0).length >=
        2,
    ),
  );
  await page.keyboard.press("Space");
  const snap = await page.evaluate(() =>
    JSON.stringify(window.bloodlines.simulation.sides),
  );
  const time = await page.evaluate(() => window.bloodlines.simulation.time);
  await page.waitForTimeout(600);
  assert.equal(
    await page.evaluate(() =>
      JSON.stringify(window.bloodlines.simulation.sides),
    ),
    snap,
  );
  assert.equal(
    await page.evaluate(() => window.bloodlines.simulation.time),
    time,
  );
  await page.click("#resume");
  check("pause freezes simulation and resume works");
  await page.click("#speed");
  const before = await page.evaluate(() => window.bloodlines.simulation.time);
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => window.bloodlines.simulation.time);
  assert.ok(after - before > 1.6 && after - before < 2.6);
  await page.click("#speed");
  check("2× speed advances the real game clock");
  // Controlled economy fixtures isolate UI buttons without waiting for passive income.
  await page.evaluate(() => {
    window.bloodlines.simulation.sides[0].money = 2500;
  });
  await page.click('[data-tab="defense"]');
  await page.click('[data-build="0"]');
  await page.click('[data-build="1"]');
  await page.click("#cover");
  await page.click("#economy");
  assert.ok(
    await page.evaluate(() => {
      const s = window.bloodlines.simulation.sides[0];
      return s.defenses.length === 2 && s.cover && s.economy === 1;
    }),
  );
  await page.click('[data-salvage="0"]');
  assert.equal(
    await page.evaluate(
      () => window.bloodlines.simulation.sides[0].defenses.length,
    ),
    1,
  );
  check("fortifications, terrain cover, economy upgrade and salvage");
  await page.click('[data-tab="army"]');
  for (let era = 0; era < 7; era++) {
    await page.evaluate(() => {
      window.bloodlines.simulation.sides[0].xp = 1000;
    });
    await page.click("#evolve");
    await page.waitForTimeout(170);
    assert.equal(
      await page.evaluate(() => window.bloodlines.simulation.sides[0].era),
      era + 1,
    );
    assert.ok(await page.locator(`[data-era="${era + 1}"].current`).count());
  }
  assert.ok(
    await page
      .getByRole("button", { name: "Rekrutuj: Operator FPV", exact: true })
      .count(),
  );
  await page.evaluate(() => {
    window.bloodlines.simulation.sides[0].money = 2500;
  });
  await page.click('[data-recruit="1"]');
  await page.click('[data-tab="intel"]');
  await page.click("#jam");
  await page.click("#scout");
  assert.ok(
    await page.evaluate(() => {
      const s = window.bloodlines.simulation;
      return s.sides[1].jam > 0 && s.sides[0].recon > 0;
    }),
  );
  check("all eight era interfaces, FPV recruitment, EW and recon");
  await page.click('[data-tab="army"]');
  await page.waitForTimeout(5500);
  await page.click("#special");
  assert.ok(
    await page.evaluate(
      () => window.bloodlines.simulation.sides[0].specialCd > 0,
    ),
  );
  await page.waitForTimeout(1900);
  assert.equal(
    await page.evaluate(() => window.bloodlines.simulation.specials.length),
    0,
  );
  check("special attack resolves rather than remaining a UI effect");
  await page.screenshot({ path: "test-results/modern.png" });
  // Restart first: the full match uses initial resources and no economy/era fixtures.
  await page.click("#pause");
  await page.click("#abandon");
  await page.click("#restart");
  const match = await page.evaluate(() => {
    const s = window.bloodlines.simulation;
    s.autoplay = true;
    while (!s.result && s.time < 1500) {
      s.tick(0.1);
      s.events = s.events.filter((e) => e.type === "end");
    }
    return { result: s.result, time: s.time };
  });
  assert.ok(match.result);
  await page.waitForTimeout(500);
  assert.ok(await page.locator("#restart").isVisible());
  await page.click("#restart");
  assert.ok(
    await page.evaluate(
      () =>
        window.bloodlines.simulation.time < 2 &&
        window.bloodlines.simulation.sides[0].era === 0,
    ),
  );
  check(
    `full in-browser match finishes (${Math.round(match.time)}s) and restart clears state`,
  );
  await page.click("#pause");
  await page.click("#abandon");
  assert.match(await page.locator(".dialog h1").textContent(), /przełamana/);
  await page.click("#restart");
  check("defeat screen, stats and second restart");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  for (let i = 0; i < 3; i++)
    assert.ok(await page.locator(`[data-recruit="${i}"]`).isVisible());
  await page.click('[data-recruit="0"]');
  assert.equal(
    await page.evaluate(() => window.bloodlines.simulation.recruited),
    1,
  );
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  check("390px mobile layout, no horizontal overflow, touch-sized recruitment");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: "test-results/landscape.png", fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  check("landscape layout");
  await page.click("#audio");
  assert.match(
    await page.locator("#audio").getAttribute("aria-label"),
    /Włącz/,
  );
  await page.click("#audio");
  check("audio toggle");
  await page.reload();
  await page.waitForSelector("#start");
  assert.ok(await page.locator('[data-difficulty="hard"].selected').count());
  check("localStorage settings survive reload");
  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        function frame(t) {
          frames++;
          if (t - start >= 1200)
            resolve(Math.round((frames * 1000) / (t - start)));
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }),
  );
  console.log(
    `Measured requestAnimationFrame: ${fps} FPS (headless Chromium, idle menu, not physical-device benchmark)`,
  );
  assert.deepEqual(remote, [], "game makes no external network requests");
  assert.deepEqual(failed, [], "no missing resources");
  assert.deepEqual(errors, [], "no console or page errors");
  check("local assets only, no missing resources or browser errors");
  console.log("All browser checks passed.");
} finally {
  await browser.close();
}
