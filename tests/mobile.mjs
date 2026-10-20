import { chromium, webkit, devices } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.TEST_URL || "http://127.0.0.1:4173";
const report = {
  date: new Date().toISOString(),
  engine: "Chromium",
  physicalIOS: false,
  checks: [],
  metrics: [],
  webkit: "not run",
};
await fs.mkdir("test-results/mobile", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const checks = (name) => {
  report.checks.push(name);
  console.log("PASS", name);
};
async function ready(page) {
  await page.waitForSelector("#start");
  await page.waitForFunction(
    () =>
      document.querySelector("#startup").hidden &&
      window.bloodlines?.renderer.scene.ready,
  );
}
function monitor(page) {
  const logs = { errors: [], failed: [], offline: false, offlineErrors: [] };
  page.on("pageerror", (e) => logs.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error")
      (logs.offline ? logs.offlineErrors : logs.errors).push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) logs.failed.push(`${r.status()} ${r.url()}`);
  });
  return logs;
}
try {
  // Reproduce the old blank document without claiming to emulate Files/Quick Look.
  let baseline;
  try {
    baseline = await fs.readFile(
      process.env.BASELINE_HTML ||
        new URL("../.local/baseline.html", import.meta.url),
      "utf8",
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    console.log(
      "UNRUN old baseline: set BASELINE_HTML to an original exported HTML file.",
    );
  }
  if (baseline) {
    const old = await browser.newContext({ javaScriptEnabled: false });
    const oldPage = await old.newPage();
    await oldPage.setContent(baseline);
    assert.equal((await oldPage.locator("body").innerText()).trim(), "");
    await old.close();
    checks(
      "old standalone has no visible fallback when scripting is unavailable",
    );
  }
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const noJSPage = await noJS.newPage();
  await noJSPage.goto(base);
  assert.match(await noJSPage.locator("body").innerText(), /Safari/);
  assert.ok(await noJSPage.locator("#startup").isVisible());
  await noJS.close();
  checks(
    "new hosted page gives readable instructions with JavaScript disabled",
  );
  const noCanvas = await browser.newContext({ serviceWorkers: "block" });
  const cp = await noCanvas.newPage();
  await cp.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await cp.goto(base);
  await cp.waitForFunction(() =>
    document.querySelector("#startup-title").textContent.includes("Nie udało"),
  );
  assert.match(await cp.locator("#startup-detail").innerText(), /Canvas 2D/);
  await noCanvas.close();
  checks(
    "missing Canvas 2D produces a visible diagnostic instead of a black screen",
  );
  const broken = await browser.newContext({ serviceWorkers: "block" });
  await broken.route("**/assets/main-*.js", (route) => route.abort());
  const bp = await broken.newPage();
  await bp.goto(base);
  await bp.waitForFunction(() =>
    document.querySelector("#startup-title").textContent.includes("Nie udało"),
  );
  assert.ok(await bp.locator("#startup-retry").isVisible());
  await broken.close();
  checks("failed engine import produces a visible error and retry action");
  const noAudio = await browser.newContext({
    ...devices["iPhone 11"],
    serviceWorkers: "block",
  });
  const ap = await noAudio.newPage();
  const ae = monitor(ap);
  await ap.addInitScript(() => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/.test(type) ? null : original.call(this, type, ...args);
    };
    localStorage.setItem(
      "bloodlines-v1",
      JSON.stringify({ difficulty: "corrupted" }),
    );
  });
  await ap.goto(base);
  await ready(ap);
  await ap.tap("#start");
  await ap.tap('[data-recruit="0"]');
  await ap.waitForTimeout(2100);
  assert.ok(
    await ap.evaluate(() =>
      window.bloodlines.simulation.units.some((u) => u.side === 0),
    ),
  );
  assert.deepEqual(ae.errors, []);
  await noAudio.close();
  checks(
    "Canvas-only rendering, unavailable audio and invalid saved preferences do not prevent play",
  );
  const contexts = [
    { name: "414x896", width: 414, height: 896 },
    { name: "390x844", width: 390, height: 844 },
    { name: "375x667", width: 375, height: 667 },
    { name: "402x874", width: 402, height: 874 },
    { name: "440x956", width: 440, height: 956 },
    { name: "896x414", width: 896, height: 414 },
    { name: "844x390", width: 844, height: 390 },
    { name: "667x375", width: 667, height: 375 },
  ];
  for (const device of contexts) {
    const context = await browser.newContext({
      ...devices["iPhone 11"],
      viewport: { width: device.width, height: device.height },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const logs = monitor(page);
    await page.goto(base);
    await ready(page);
    await page.tap("#start");
    await page.tap('[data-recruit="0"]');
    assert.equal(
      await page.evaluate(() => window.bloodlines.simulation.recruited),
      1,
    );
    assert.ok(
      await page.evaluate(
        (w) => document.documentElement.scrollWidth <= w && innerWidth <= w,
        device.width,
      ),
    );
    const bounds = await page.evaluate(() =>
      [
        "#quality",
        "#pause",
        "#speed",
        "#audio",
        "#help",
        "#evolve",
        "#special",
        '[data-recruit="0"]',
        '[data-tab="army"]',
        '[data-tab="defense"]',
        '[data-tab="intel"]',
      ].map((s) => {
        const el = document.querySelector(s),
          r = el.getBoundingClientRect();
        return { s, w: r.width, h: r.height };
      }),
    );
    for (const b of bounds) {
      assert.ok(
        b.w >= 43.5 && b.h >= 43.5,
        `${device.name}: ${b.s} is too small (${b.w}x${b.h})`,
      );
    }
    assert.ok(
      await page
        .locator("#money")
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 20),
    );
    await page.tap("#view-mode");
    await page.tap("#recenter");
    await page.tap('[data-tab="defense"]');
    await page.evaluate(
      () => (window.bloodlines.simulation.sides[0].money = 2500),
    );
    await page.tap('[data-build="0"]');
    assert.equal(
      await page.evaluate(
        () => window.bloodlines.simulation.sides[0].defenses.length,
      ),
      1,
    );
    await page.tap('[data-tab="army"]');
    await page.screenshot({
      path: `test-results/mobile/${device.name}.png`,
      fullPage: true,
    });
    assert.deepEqual(logs.errors, []);
    assert.deepEqual(logs.failed, []);
    checks(
      `touch controls, readable resources, all tabs and canvas layout at ${device.name}`,
    );
    await context.close();
  }
  const context = await browser.newContext({
    ...devices["iPhone 11"],
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const logs = monitor(page);
  await page.goto(base);
  await ready(page);
  await page.tap("#start");
  await page.tap('[data-recruit="0"]');
  await page.tap('[data-recruit="1"]');
  await page.waitForTimeout(5500);
  assert.ok(
    await page.evaluate(() =>
      window.bloodlines.simulation.units.some((u) => u.side === 1),
    ),
  );
  await page.evaluate(() => {
    const s = window.bloodlines.simulation;
    for (let i = 0; i < 280; i++) s.tick(0.1);
  });
  await page.waitForTimeout(200);
  assert.ok(
    await page.evaluate(
      () =>
        window.bloodlines.simulation.sides.some((s) => s.kills > 0) ||
        window.bloodlines.simulation.units.some((u) => u.hp < u.maxHp),
    ),
  );
  checks("AI recruits and real combat damages or kills units");
  await page.tap("#pause");
  const frozen = await page.evaluate(() =>
    JSON.stringify({
      t: window.bloodlines.simulation.time,
      s: window.bloodlines.simulation.sides,
      u: window.bloodlines.simulation.units,
    }),
  );
  await page.waitForTimeout(500);
  assert.equal(
    await page.evaluate(() =>
      JSON.stringify({
        t: window.bloodlines.simulation.time,
        s: window.bloodlines.simulation.sides,
        u: window.bloodlines.simulation.units,
      }),
    ),
    frozen,
  );
  await page.tap("#resume");
  checks("touch pause freezes the complete simulation and resumes");
  for (let era = 1; era < 8; era++) {
    await page.evaluate(
      () => (window.bloodlines.simulation.sides[0].xp = 1000),
    );
    await page.tap("#evolve");
    await page.waitForFunction(
      (e) => window.bloodlines.simulation.sides[0].era === e,
      era,
    );
  }
  await page.tap('[data-tab="intel"]');
  await page.tap("#jam");
  await page.tap("#scout");
  assert.ok(
    await page.evaluate(
      () =>
        window.bloodlines.simulation.sides[1].jam > 0 &&
        window.bloodlines.simulation.sides[0].recon > 0,
    ),
  );
  await page.tap("#special");
  assert.ok(
    await page.evaluate(
      () => window.bloodlines.simulation.sides[0].specialCd > 0,
    ),
  );
  checks(
    "eight eras, EW, recon and special attack are usable without a keyboard",
  );
  await page.tap("#quality");
  await page.tap('[data-quality="low"]');
  await page.tap("#quality-close");
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.bloodlines.quality.key), "low");
  assert.equal(
    await page.evaluate(() => window.bloodlines.renderer.scene.surface.width),
    960,
  );
  checks(
    "manual low quality lowers surface resolution without replacing the match",
  );
  await page.evaluate(() => (window.sameMatch = window.bloodlines.simulation));
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(400);
  assert.ok(
    await page.evaluate(
      () => window.sameMatch === window.bloodlines.simulation,
    ),
  );
  assert.ok(
    await page.evaluate(
      () =>
        Math.abs(
          window.bloodlines.renderer.game.scale.width -
            document.querySelector("#battlefield").clientWidth,
        ) < 3,
    ),
  );
  checks("orientation change resizes the canvas and retains match state");
  await page.evaluate(() => {
    const r = document.documentElement;
    r.style.setProperty("--safe-left", "44px");
    r.style.setProperty("--safe-right", "44px");
    r.style.setProperty("--safe-bottom", "21px");
  });
  await page.waitForTimeout(300);
  assert.ok(
    await page.evaluate(() => {
      const r = document.querySelector("#quality").getBoundingClientRect();
      return (
        r.left >= 44 &&
        r.right <= innerWidth - 44 &&
        document.documentElement.scrollWidth <= innerWidth
      );
    }),
  );
  await page.screenshot({
    path: "test-results/mobile/synthetic-safe-area.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    for (const k of ["--safe-left", "--safe-right", "--safe-bottom"])
      document.documentElement.style.removeProperty(k);
  });
  checks(
    "synthetic 44px side and 21px bottom safe-area insets preserve controls",
  );

  await page.tap("#pause");
  await page.tap("#abandon");
  await page.tap("#restart");
  assert.ok(
    await page.evaluate(
      () =>
        window.bloodlines.simulation.time < 2 &&
        window.bloodlines.simulation.sides[0].era === 0,
    ),
  );
  checks("touch defeat screen and restart reset the match");
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, {
    timeout: 15000,
  });
  logs.offline = true;
  await context.setOffline(true);
  await page.reload();
  await ready(page);
  await page.tap("#start");
  await page.tap('[data-recruit="0"]');
  await page.waitForTimeout(2100);
  assert.ok(
    await page.evaluate(() =>
      window.bloodlines.simulation.units.some((u) => u.side === 0),
    ),
  );
  await context.setOffline(false);
  logs.offline = false;
  assert.ok(
    logs.offlineErrors.every((e) => e.includes("ERR_INTERNET_DISCONNECTED")),
  );
  report.offlineNetworkDiagnostics = logs.offlineErrors;
  checks(
    "service worker reloads the entire game offline after the first hosted visit",
  );
  assert.deepEqual(logs.errors, []);
  assert.deepEqual(logs.failed, []);
  await context.close();
  // Sustained stress is a controlled 56-unit fixture, not a claim about real iPhone hardware.
  const stressContext = await browser.newContext({
    ...devices["iPhone 11"],
    viewport: { width: 844, height: 390 },
    serviceWorkers: "block",
  });
  const stress = await stressContext.newPage();
  const stressLogs = monitor(stress);
  await stress.goto(base);
  await ready(stress);
  await stress.tap("#start");
  await stress.tap('[data-recruit="0"]');
  await stress.waitForTimeout(2100);
  await stress.evaluate(() => {
    const s = window.bloodlines.simulation,
      b = s.units.find((u) => u.side === 0);
    s.aiTimers = [Infinity, Infinity];
    s.sides.forEach((side) => {
      side.era = 7;
      side.queue = [];
    });
    s.units = Array.from({ length: 56 }, (_, i) => ({
      ...b,
      id: 1000 + i,
      side: i < 28 ? 0 : 1,
      x: i < 28 ? 200 + i * 22 : 1400 - (i - 28) * 22,
      hp: 1e9,
      maxHp: 1e9,
      speed: 0,
      weapon: i % 3 ? "rifle" : "tank",
    }));
  });
  const cdp = await stressContext.newCDPSession(stress);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await stress.waitForTimeout(2000);
  await cdp.send("HeapProfiler.collectGarbage");
  const before = await cdp.send("Runtime.getHeapUsage");
  const first = await stress.evaluate(() => ({
    frames: window.bloodlines.quality.paintedFrames,
    t: performance.now(),
  }));
  await stress.waitForTimeout(12000);
  const last = await stress.evaluate(() => ({
    frames: window.bloodlines.quality.paintedFrames,
    t: performance.now(),
    diagnostics: window.bloodlines.diagnostics,
  }));
  await cdp.send("HeapProfiler.collectGarbage");
  const after = await cdp.send("Runtime.getHeapUsage");
  const metric = {
    fixture: "56 units, era VIII, 4x CPU throttle, mobile emulation",
    renderFPS: +(
      ((last.frames - first.frames) * 1000) /
      (last.t - first.t)
    ).toFixed(1),
    usedHeapBefore: before.usedSize,
    usedHeapAfter: after.usedSize,
    diagnostics: last.diagnostics,
  };
  report.metrics.push(metric);
  console.log(JSON.stringify(metric));
  assert.ok(
    last.frames - first.frames > 100,
    "renderer continues under stress",
  );
  assert.ok(
    after.usedSize - before.usedSize < 8 * 1024 * 1024,
    "retained JS heap growth should be bounded in this sample",
  );
  assert.ok(
    last.diagnostics.units === 56 &&
      last.diagnostics.cachedSprites <= 64 &&
      last.diagnostics.effects <= 150 &&
      last.diagnostics.pooledEffects <= 150 &&
      last.diagnostics.portraitCache <= 3 &&
      last.diagnostics.audioBuffers <= 8,
  );
  assert.deepEqual(stressLogs.errors, []);
  await stressContext.close();
  checks(
    "bounded effects, audio and portrait caches under sustained throttled 56-unit stress",
  );
  // Run real WebKit when installed. Linux WebKit still is not physical iOS Safari.
  try {
    const wb = await webkit.launch();
    const wc = await wb.newContext({ ...devices["iPhone 11"] });
    const wp = await wc.newPage();
    const wl = monitor(wp);
    await wp.goto(base);
    await ready(wp);
    await wp.tap("#start");
    await wp.tap('[data-recruit="0"]');
    await wp.waitForTimeout(2200);
    assert.ok(
      await wp.evaluate(() =>
        window.bloodlines.simulation.units.some((u) => u.side === 0),
      ),
    );
    assert.deepEqual(wl.errors, []);
    await wb.close();
    report.webkit = "passed Linux WebKit touch smoke";
    checks("Linux WebKit menu/start/touch recruitment");
  } catch (error) {
    if (
      !/Executable doesn't exist|Host system is missing dependencies/.test(
        error.message,
      )
    )
      throw error;
    report.webkit =
      "unavailable: " +
      error.message
        .split("\n")
        .find((l) => l.includes("Executable") || l.includes("dependencies"));
    console.log("UNRUN WebKit:", report.webkit);
  }
  report.result = "passed tested Chromium checks";
} finally {
  await fs.writeFile(
    "test-results/mobile-report.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
