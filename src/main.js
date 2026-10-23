import { battlefieldUrl } from "./assets.js";
import { AdaptiveQuality, browserEnvironment } from "./quality.js";
import { ASSAULT, repairCost } from "./game/orders.js";
import { Simulation } from "./game/simulation.js";
import {
  ERAS,
  DIFFICULTIES,
  unitStats,
  defenseStats,
  CLASS_NAMES,
  COUNTERS,
} from "./game/data.js";
import { passiveIncome, economyCost } from "./game/economy.js";
import { createRenderer } from "./render/scene.js";
import { makePortrait } from "./render/art.js";
import { AudioSystem } from "./audio.js";
import { icon } from "./ui/icons.js";
import { load, save } from "./ui/storage.js";
document.documentElement.style.setProperty(
  "--battlefield-image",
  `url("${battlefieldUrl}")`,
);
const $ = (s) => document.querySelector(s);
const prefs = load();
let sim = null,
  speed = 1,
  screen = "menu",
  tab = "army",
  difficulty = DIFFICULTIES[prefs.difficulty] ? prefs.difficulty : "normal",
  uiTimer = 0,
  previousEra = -1,
  toastTimer = null;
const sound = new AudioSystem();
sound.muted = !!prefs.muted;
const quality = new AdaptiveQuality(browserEnvironment());
if (["high", "balanced", "low"].includes(prefs.quality))
  quality.choose(prefs.quality);
const portraitCache = new Map();
function portrait(era, slot) {
  const key = `${era}:${slot}`;
  if (!portraitCache.has(key)) {
    // Retain three portraits instead of rendering and base64-encoding all 24 at boot.
    if (portraitCache.size >= 3) portraitCache.clear();
    portraitCache.set(key, makePortrait(era, slot, unitStats(era, slot)));
  }
  return portraitCache.get(key);
}
$("#app").innerHTML = `
<header class="masthead"><a class="brand" href="./" aria-label="Bloodlines — ekran główny">${icon("crest", 33)}<span>BLOODLINES<small>AGE OF CONFLICT</small></span></a><div class="header-center"><span class="live-dot"></span> KAMPANIA PRZEZ WIEKI <span class="separator">/</span> <span id="header-era">10 000 P.N.E. — 2026</span></div><div class="header-actions"><button class="quality-button" id="quality" aria-label="Jakość grafiki">AUTO</button><button class="icon-button" id="help" aria-label="Instrukcja" title="Instrukcja [H]">${icon("help")}</button><button class="icon-button" id="audio" aria-label="Wycisz dźwięk" title="Dźwięk [M]">${icon(sound.muted ? "mute" : "sound")}</button><button class="speed-button" id="speed" title="Prędkość [F]">1×</button><button class="icon-button" id="pause" aria-label="Pauza" title="Pauza [Spacja]">${icon("pause")}</button></div></header>
<main class="command-center">
<section class="battle-status"><div class="coalition ally"><div class="faction-emblem">${icon("crest", 27)}</div><div class="faction-data"><span class="eyebrow">TWOJA KOALICJA</span><h2>Przymierze Świtu</h2><div class="health"><i id="hp-player"></i></div><div class="hp-values"><span id="health-player">6 000 / 6 000</span><span>INTEGRALNOŚĆ BAZY</span></div></div></div><div class="battle-clock"><span class="eyebrow">LINIA KONFLIKTU</span><strong id="clock">00:00</strong><span id="battle-state">OCZEKIWANIE NA ROZKAZY</span></div><div class="coalition enemy"><div class="faction-data"><span class="eyebrow">WROGA KOALICJA</span><h2>Dyrektorat Żelaza</h2><div class="health"><i id="hp-enemy"></i></div><div class="hp-values"><span>INTEGRALNOŚĆ BAZY</span><span id="health-enemy">6 000 / 6 000</span></div></div><div class="faction-emblem">${icon("flag", 27)}</div></div></section>
<section class="theater" aria-label="Pole bitwy"><div id="battlefield"></div><div class="field-controls"><button id="view-mode" aria-label="Zmień widok pola bitwy">${quality.mobile ? "Całe pole" : "Zbliżenie frontu"}</button><button id="recenter" aria-label="Śledź front">Śledź front</button></div><div class="theater-top"><span class="location">${icon("target", 14)} DOLINA POPIOŁÓW <i>47° N · 18° E</i></span><span class="weather"><span></span> ŚWIT · MGŁA W DOLINIE</span></div><div class="theater-bottom"><span id="field-caption">JEDNA LUDZKOŚĆ. OSIEM EPOK. NIEKOŃCZĄCY SIĘ KONFLIKT.</span><span id="unit-count">0 / 28 JEDNOSTEK</span></div><div class="pause-label hidden" id="pause-label">${icon("pause", 28)}<h2>ROZKAZY WSTRZYMANE</h2><p>Spacja lub przycisk pauzy, aby wznowić</p><button class="primary" id="resume">WZNÓW BITWĘ ${icon("play", 16)}</button><button class="text-button" id="abandon">ZAKOŃCZ KAMPANIĘ</button></div><div id="era-announcement" class="era-announcement hidden"></div></section>
<section class="command-deck"><div class="deck-heading"><div class="deck-tabs"><button data-tab="army" class="active">${icon("sword", 17)} Oddziały <kbd>1–3</kbd></button><button data-tab="defense">${icon("fort", 17)} Obrona</button><button data-tab="intel">${icon("eye", 17)} Taktyka</button></div><div class="resources"><div>${icon("coin", 23)}<span><strong id="money">290</strong><small id="income">+7,0 / s</small></span></div><div>${icon("star", 23)}<span><strong id="xp">0</strong><small>DOŚWIADCZENIE</small></span></div></div></div><div class="deck-content"><div id="action-cards" class="action-cards"></div><aside class="strategic-actions"><button id="evolve" class="evolve-button">${icon("evolve", 24)}<span>ROZWÓJ CYWILIZACJI<strong id="next-era">Starożytność</strong><small id="evolution-cost">100 XP</small></span><kbd>E</kbd><i id="evolution-progress"></i></button><button id="special" class="special-button">${icon("special", 24)}<span>ATAK SPECJALNY<strong id="special-name">Grad kamieni</strong><small id="special-cd">Gotowy do użycia</small></span><kbd>Q</kbd></button></aside></div><div class="tactical-orders"><button id="assault" title="8 s: +15% obrażeń, +25% marszu, ale +10% otrzymywanych obrażeń. Odnowienie 50 s. [R]">${icon("arrow",18)}<span>Natarcie <small id="assault-status">100 monet · 8 s</small></span><kbd>R</kbd></button><button id="repair" title="Przywraca 8% maksymalnego życia bazy. Raz na epokę. [T]">${icon("fort",18)}<span>Naprawa polowa <small id="repair-status">180 monet · raz na epokę</small></span><kbd>T</kbd></button></div><div class="queue-strip"><span>${icon("gear", 13)} KOLEJKA REKRUTACJI</span><div id="queue">Oczekiwanie na rozkazy</div><span class="queue-tip">Oddziały walczą automatycznie. Ty wyznaczasz strategię.</span></div></section>
<section class="timeline" aria-label="Postęp epok">${ERAS.map((e, i) => `<div class="era-point ${i === 0 ? "current" : ""}" data-era="${i}"><span class="era-number">${String(i + 1).padStart(2, "0")}</span><div><strong>${e.name}</strong><small>${e.date}</small></div><i></i></div>`).join("")}</section>
<footer class="footer"><span>HISTORIA PISANA DECYZJAMI</span><span id="tip">PIECHOTA → CIĘŻKIE · DYSTANSOWE → PIECHOTA · CIĘŻKIE → DYSTANSOWE</span><button id="history">${icon("help", 13)} NOTA HISTORYCZNA</button></footer>
</main><div id="toast" class="toast hidden" role="status"></div><div id="modal-root"></div>`;
const renderer = createRenderer("battlefield", () => sim, frame, quality);
let updateToastShown = false;
function persist(extra = {}) {
  Object.assign(prefs, { difficulty, muted: sound.muted, ...extra });
  save(prefs);
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.add("hidden"), 3600);
}
function modal(html) {
  $("#modal-root").innerHTML =
    `<div class="modal-shade"><div class="dialog">${html}</div></div>`;
}
function closeModal() {
  $("#modal-root").innerHTML = "";
}
function showMenu() {
  screen = "menu";
  document.body.dataset.screen = "menu";
  modal(
    `<div class="menu-kicker"><span></span> STRATEGIA CZASU RZECZYWISTEGO</div><div class="menu-title">BLOODLINES</div><div class="menu-subtitle">AGE OF CONFLICT</div><div class="ornament"><i></i>${icon("crest", 24)}<i></i></div><h1>Poprowadź swoich ludzi.<br><em>Zostaw ślad w historii.</em></h1><p class="menu-description">Poprowadź swoją koalicję od kamiennego ostrza po erę dronów.<br>Dobierz oddziały, rozwijaj koalicję i przełam linię frontu.</p><div class="difficulty-label">WYBIERZ POZIOM DOWODZENIA</div><div class="difficulty-options">${Object.entries(
      DIFFICULTIES,
    )
      .map(
        ([key, d], i) =>
          `<button data-difficulty="${key}" class="${key === difficulty ? "selected" : ""}"><span>${"Ⅰ".repeat(i + 1)}</span>${d.name}</button>`,
      )
      .join(
        "",
      )}</div><p class="difficulty-description" id="difficulty-description">${DIFFICULTIES[difficulty].description}</p><button class="primary start-campaign" id="start">ROZPOCZNIJ KAMPANIĘ ${icon("arrow", 20)}</button><div class="menu-meta"><span>8 EPOK HISTORYCZNYCH</span><i>·</i><span>LOKALNE AI</span><i>·</i><span>15–25 MIN</span></div><button class="text-button" id="menu-help">PIERWSZY RAZ? POZNAJ ZASADY ${icon("help", 13)}</button>${prefs.matches ? `<div class="record">ROZEGRANE: ${prefs.matches} · ZWYCIĘSTWA: ${prefs.wins || 0} · REKORD: ${prefs.best ? formatTime(prefs.best) : "—"}</div>` : ""}`,
  );
  document.querySelectorAll("[data-difficulty]").forEach(
    (b) =>
      (b.onclick = () => {
        difficulty = b.dataset.difficulty;
        persist();
        showMenu();
      }),
  );
  $("#start").onclick = startGame;
  $("#menu-help").onclick = () => showHelp(true);
}
function startGame() {
  sound.start();
  sim = new Simulation({ difficulty, seed: Date.now() >>> 0 });
  speed = 1;
  previousEra = -1;
  screen = "battle";
  tab = "army";
  closeModal();
  document.body.dataset.screen = "battle";
  $("#speed").textContent = "1×";
  $("#pause-label").classList.add("hidden");
  $("#pause").innerHTML = icon("pause");
  $("#pause").setAttribute("aria-label", "Pauza");
  renderer.scene.effects = [];
  renderer.scene.craters.length=0;
  renderCards();
  updateUI();
  toast(
    quality.mobile
      ? "Dotknij kart, aby rekrutować. Najwygodniej grać poziomo; widok frontu możesz przesuwać palcem."
      : "Witaj, dowódco. Zrekrutuj piechotę [1] i osłoń ją oddziałem dystansowym [2].",
  );
}
function formatTime(t) {
  return `${Math.floor(t / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(t % 60)
    .toString()
    .padStart(2, "0")}`;
}
function act(fn) {
  if (!sim || screen !== "battle") return;
  if (sim.paused) {
    toast("Wznów bitwę, aby wydać rozkaz.");
    return;
  }
  const result = fn();
  if (!result) toast(sim.lastError);
  else updateUI();
}
function updateCards() {
  const s = sim?.sides[0];
  if (!s) return;
  for (let i = 0; i < 3; i++) {
    const b = $(`[data-recruit="${i}"]`);
    if (b) {
      const cost = unitStats(s.era, i).cost,
        full =
          s.queue.length >= 5 ||
          sim.units.filter((u) => u.side === 0).length + s.queue.length >= 28;
      b.classList.toggle("unavailable", s.money < cost || full);
      b.setAttribute("aria-disabled", String(s.money < cost || full));
    }
  }
  for (const b of document.querySelectorAll("[data-build]")) {
    const d = defenseStats(s.era, Number(b.dataset.build));
    b.classList.toggle(
      "unavailable",
      s.money < d.cost || s.defenses.length >= 2,
    );
  }
}
function renderCards() {
  const s = sim?.sides[0] || { era: 0 },
    era = ERAS[s.era];
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  if (tab === "army") {
    $("#action-cards").innerHTML = era.units
      .map((name, i) => {
        const u = unitStats(s.era, i);
        return `<button class="unit-card" data-recruit="${i}" aria-label="Rekrutuj: ${name}" title="${COUNTERS[u.cls]} Życie: ${u.hp}. Obrażenia: ${u.damage} co ${u.interval} s. Zasięg: ${u.range}. Szkolenie: ${u.training} s."><div class="unit-art" style="background-image:url('${portrait(s.era, i)}')"><kbd>${i + 1}</kbd><span class="class-label">${CLASS_NAMES[u.cls]}</span></div><div class="unit-info"><h3>${name}</h3><div class="unit-bottom"><span class="unit-stat">${icon("sword", 12)} ${u.damage} <span>·</span> ${u.hp} HP</span><strong>${icon("coin", 14)} ${u.cost}</strong></div></div></button>`;
      })
      .join("");
    document
      .querySelectorAll("[data-recruit]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            act(() => sim.recruit(0, Number(b.dataset.recruit)))),
      );
  } else if (tab === "defense") {
    $("#action-cards").innerHTML =
      [0, 1]
        .map((type) => {
          const d = defenseStats(s.era, type);
          return `<button class="unit-card defense-card" data-build="${type}"><div class="defense-symbol">${icon(type ? "target" : "fort", 40)}<span>STANOWISKO ${type + 1}</span></div><div class="unit-info"><h3>${d.name}</h3><div class="unit-bottom"><span class="unit-stat">${Math.round(d.damage)} DMG · ${d.range} ZASIĘG</span><strong>${icon("coin", 14)} ${d.cost}</strong></div></div></button>`;
        })
        .join("") +
      `<div class="utility-card"><button id="cover">${icon("fort", 15)} Osłony terenowe <b>180</b><small>−22% obrażeń w pobliżu bazy</small></button><button id="economy">${icon("coin", 15)} Zaopatrzenie ${s.economy || 0}/3 <b>${economyCost({ ...s, economy: s.economy || 0 })}</b><small>+2,5 monety / sekundę</small></button><div class="salvage">${(s.defenses || []).map((d, i) => `<button data-salvage="${i}">Rozbierz ${i + 1} · zwrot ${Math.round(d.cost * 0.4)}</button>`).join("") || "2 wolne stanowiska obronne"}</div></div>`;
    document.querySelectorAll("[data-build]").forEach(
      (b) =>
        (b.onclick = () =>
          act(() => {
            const ok = sim.build(0, Number(b.dataset.build));
            if (ok) renderCards();
            return ok;
          })),
    );
    $("#cover").onclick = () =>
      act(() => {
        const ok = sim.cover(0);
        if (ok) renderCards();
        return ok;
      });
    $("#economy").onclick = () =>
      act(() => {
        const ok = sim.upgradeEconomy(0);
        if (ok) renderCards();
        return ok;
      });
    document.querySelectorAll("[data-salvage]").forEach(
      (b) =>
        (b.onclick = () =>
          act(() => {
            const ok = sim.salvage(0, Number(b.dataset.salvage));
            if (ok) renderCards();
            return ok;
          })),
    );
  } else {
    $("#action-cards").innerHTML =
      `<div class="intel-card"><span class="eyebrow">RAPORT TAKTYCZNY</span><h3>Wyposażenie, nie pochodzenie.</h3><p>Piechota kontruje ciężkich. Strzelcy kontrują piechotę. Ciężkie jednostki przełamują strzelców. Oblężenie zadaje bazom ×3,2 obrażeń.</p><small>Po 10 min rosną obrażenia. Po 12 min bazy tracą życie wskutek wyczerpania. Kontrola centrum przyspiesza ten proces u wroga.</small></div><div class="utility-card modern"><button id="jam">${icon("signal", 18)} Walka elektroniczna<small id="jam-label">${s.era < 7 ? "Wymaga epoki VIII" : "Blokuje drony wroga na 12 s · odnowienie 38 s"}</small></button><button id="scout">${icon("eye", 18)} Dron rozpoznawczy<small id="scout-label">${s.era < 7 ? "Wymaga epoki VIII" : "+20% obrażeń przez 14 s · odnowienie 45 s"}</small></button></div>`;
    $("#jam").onclick = () => act(() => sim.jam(0));
    $("#scout").onclick = () => act(() => sim.scout(0));
  }
  updateCards();
}
function frame(realDt) {
  if (!sim || screen !== "battle") return;
  const dt = Math.min(realDt, 0.1);
  if (!sim.paused) {
    let remaining = dt * speed;
    while (remaining > 0) {
      const step = Math.min(remaining, 1 / 60);
      sim.tick(step);
      remaining -= step;
    }
    sound.music(dt, sim.sides[0].era);
  }
  for (const event of sim.events) {
    sound.event(event);
    renderer.scene.effect(event);
    if (event.type === "evolve") {
      if (event.side === 0) {
        renderCards();
        const a = $("#era-announcement");
        a.innerHTML = `<small>NOWA ERA CYWILIZACJI</small><h2>${ERAS[event.era].name}</h2><p>${ERAS[event.era].date}</p>`;
        a.classList.remove("hidden");
        setTimeout(() => a.classList.add("hidden"), 3200);
      } else
        toast(`Wywiad: przeciwnik wkroczył w epokę ${ERAS[event.era].name}.`);
    }
    if (event.type === "end") endGame();
  }
  sim.events = [];
  uiTimer -= dt;
  if (uiTimer <= 0) {
    uiTimer = quality.mobile ? 0.2 : 0.12;
    updateUI();
  }
}
function updateUI() {
  if (!sim) return;
  const s = sim.sides[0],
    e = sim.sides[1];
  $("#clock").textContent = formatTime(sim.time);
  $("#battle-state").textContent = sim.result
    ? "KAMPANIA ZAKOŃCZONA"
    : sim.paused
      ? "BITWA WSTRZYMANA"
      : `OPERACJA W TOKU · ${DIFFICULTIES[difficulty].name.toUpperCase()}`;
  for (const [id, side] of [
    ["player", s],
    ["enemy", e],
  ]) {
    $(`#health-${id}`).textContent =
      `${Math.ceil(side.hp).toLocaleString("pl-PL")} / ${side.maxHp.toLocaleString("pl-PL")}`;
    $(`#hp-${id}`).style.width = `${(side.hp / side.maxHp) * 100}%`;
  }
  $("#header-era").textContent =
    `${ERAS[s.era].name.toUpperCase()} · ${ERAS[s.era].date}`;
  $('#assault-status').textContent=s.assault>0?`Aktywne: ${Math.ceil(s.assault)} s · +15% ataku / +10% podatności`:s.assaultCd>0?`Odnowienie: ${Math.ceil(s.assaultCd)} s`:`${ASSAULT.cost} monet · 8 s natarcia`;
  $('#assault').classList.toggle('order-active',s.assault>0);
  $('#repair-status').textContent=s.repairEra===s.era?'Wykorzystano w tej epoce':`${repairCost(s)} monet · przywraca 8% życia`;
  $('#assault').setAttribute('aria-disabled',String(s.assaultCd>0||s.money<ASSAULT.cost));
  $('#repair').setAttribute('aria-disabled',String(s.repairEra===s.era||s.hp>=s.maxHp||s.money<repairCost(s)));
  $("#money").textContent = Math.floor(s.money).toLocaleString("pl-PL");
  $("#income").textContent = `+${passiveIncome(s).toLocaleString("pl-PL")} / s`;
  $("#xp").textContent = Math.floor(s.xp).toLocaleString("pl-PL");
  $("#unit-count").textContent =
    `${sim.units.filter((u) => u.side === 0).length} / 28 JEDNOSTEK`;
  $("#next-era").textContent =
    s.era < 7 ? ERAS[s.era + 1].name : "Szczyt technologii";
  $("#evolution-cost").textContent =
    s.era < 7
      ? `${Math.floor(s.xp)} / ${ERAS[s.era].xp} XP`
      : "WSZYSTKIE EPOKI ODBLOKOWANE";
  $("#evolution-progress").style.width =
    `${s.era === 7 ? 100 : Math.min(100, (s.xp / ERAS[s.era].xp) * 100)}%`;
  $("#evolve").classList.toggle("ready", s.xp >= ERAS[s.era].xp);
  $("#evolve").setAttribute(
    "aria-disabled",
    String(s.era === 7 || s.xp < ERAS[s.era].xp),
  );
  $("#special-name").textContent = ERAS[s.era].special;
  $("#special-cd").textContent =
    s.specialCd > 0
      ? `Odnowienie: ${Math.ceil(s.specialCd)} s`
      : "Gotowy · uderzenie obszarowe";
  $("#special").classList.toggle("cooling", s.specialCd > 0);
  $("#field-caption").textContent =
    s.jam > 0
      ? `ZAKŁÓCENIA ELEKTRONICZNE · ${Math.ceil(s.jam)} s`
      : s.recon > 0
        ? `ROZPOZNANIE AKTYWNE · +20% OBRAŻEŃ · ${Math.ceil(s.recon)} s`
        : sim.time > 720
          ? "WOJNA NA WYCZERPANIE · KONTROLA CENTRUM OSŁABIA WROGĄ BAZĘ"
          : sim.time > 600
            ? "ESKALACJA KONFLIKTU · ROSNĄCE OBRAŻENIA"
            : "UTRZYMAJ FRONT. CHROŃ SWOJĄ BAZĘ.";
  $("#queue").innerHTML = s.queue.length
    ? s.queue
        .map(
          (q, i) =>
            `<span class="queue-item">${ERAS[q.era].units[q.slot]}${i === 0 ? ` <b>${Math.ceil(q.remaining)}s</b><i style="width:${100 * (1 - q.remaining / q.total)}%"></i>` : ""}</span>`,
        )
        .join("")
    : "Oczekiwanie na rozkazy";
  if (previousEra !== s.era) {
    document.querySelectorAll("[data-era]").forEach((el) => {
      const era = Number(el.dataset.era);
      el.classList.toggle("current", era === s.era);
      el.classList.toggle("completed", era < s.era);
    });
    previousEra = s.era;
  }
  if (tab === "intel" && s.era === 7) {
    $("#jam-label").textContent =
      s.ewCd > 0
        ? `Odnowienie ${Math.ceil(s.ewCd)} s`
        : "Gotowe · wyłącza wrogie drony na 12 s";
    $("#scout-label").textContent =
      s.reconCd > 0
        ? `Odnowienie ${Math.ceil(s.reconCd)} s`
        : "Gotowe · +20% obrażeń przez 14 s";
  }
  updateCards();
}
function pause() {
  if (!sim || screen !== "battle") return;
  sim.paused = !sim.paused;
  if (!sim.paused) sound.start();
  $("#pause-label").classList.toggle("hidden", !sim.paused);
  $("#pause").innerHTML = icon(sim.paused ? "play" : "pause");
  $("#pause").setAttribute("aria-label", sim.paused ? "Wznów" : "Pauza");
  updateUI();
}
function endGame() {
  screen = "result";
  document.body.dataset.screen = "result";
  persist({
    matches: (prefs.matches || 0) + 1,
    wins: (prefs.wins || 0) + (sim.result === "victory" ? 1 : 0),
    best:
      sim.result === "victory"
        ? Math.min(prefs.best || Infinity, sim.time)
        : prefs.best,
  });
  const s = sim.sides[0];
  modal(
    `<div class="result-emblem">${icon(sim.result === "victory" ? "crest" : "flag", 56)}</div><span class="eyebrow">KONIEC KAMPANII</span><h1>${sim.result === "victory" ? "Zwycięstwo." : "Linia została przełamana."}</h1><p>${sim.result === "victory" ? "Dyrektorat Żelaza skapitulował. Twoja koalicja pisze kolejny rozdział historii." : "Twoja baza upadła. Historia daje jednak kolejną szansę."}</p><div class="result-stats"><div><strong>${formatTime(sim.time)}</strong><small>CZAS BITWY</small></div><div><strong>${s.kills}</strong><small>ELIMINACJE</small></div><div><strong>${s.era + 1} / 8</strong><small>EPOKI</small></div><div><strong>${sim.recruited}</strong><small>REKRUTACJE</small></div><div><strong>${Math.round(s.spent)}</strong><small>WYDATKI NA ARMIĘ</small></div><div><strong>${Math.round(s.damage)}</strong><small>OBRAŻENIA BAZY</small></div></div><button id="restart" class="primary">NOWA KAMPANIA ${icon("arrow", 18)}</button><button id="return-menu" class="text-button">WRÓĆ DO MENU</button>`,
  );
  $("#restart").onclick = startGame;
  $("#return-menu").onclick = showMenu;
}
function showHelp(fromMenu = false) {
  const prior = $("#modal-root").firstElementChild;
  const wasPaused = sim?.paused;
  if (sim) sim.paused = true;
  modal(
    `<span class="eyebrow">PODRĘCZNIK DOWÓDCY</span><h1>Wygraj bitwę o przyszłość.</h1><div class="help-grid"><div><b>01 / REKRUTUJ</b><p>Dotykaj kart jednostek lub używaj przycisków i klawiszy 1, 2, 3. Maksymalnie 5 w kolejce i 28 w armii. Jednostki walczą automatycznie.</p></div><div><b>02 / KONTRUJ</b><p>Piechota → ciężcy → strzelcy → piechota. Osłaniaj jednostki dystansowe. Oblężenie burzy bazy. Najdroższy oddział nie zawsze wygrywa.</p></div><div><b>03 / ROZWIJAJ</b><p>Monety: dochód pasywny i eliminacje. XP: czas walki i eliminacje. E otwiera nową epokę. Stare oddziały pozostają na polu.</p></div><div><b>04 / PRZEŁAMUJ</b><p>Q: atak obszarowy na największą grupę wroga. Natarcie (R) przyspiesza marsz i zwiększa obrażenia przez 8 s, kosztem większej podatności na trafienia. Naprawa (T) przywraca 8% życia bazy raz na epokę. Fortyfikacje chronią bazę. Zaopatrzenie zwiększa dochód. W epoce VIII użyj wywiadu i zakłócania.</p></div></div><div class="keyboard-help">SPACJA · PAUZA &nbsp; F · TEMPO 2× &nbsp; M · DŹWIĘK &nbsp; H · POMOC</div><p class="help-note">Dochód ograniczony do 2 500 monet. Po 10 minutach rosną obrażenia. Po 12 minutach obie bazy tracą życie wskutek wyczerpania. Oddziały w centrum przyspieszają ten proces u przeciwnika. Zniszcz wrogą bazę, zanim przeciwnik zniszczy twoją. Dostępność komend zależy od zasobów; przycisk wyjaśni brakujący warunek.</p><button class="primary" id="help-close">ROZUMIEM ${icon("arrow", 18)}</button>`,
  );
  $("#help-close").onclick = () => {
    if (fromMenu) showMenu();
    else {
      closeModal();
      if (prior) $("#modal-root").append(prior);
      if (sim) sim.paused = wasPaused;
    }
  };
}
$("#view-mode").onclick = () => {
  renderer.scene.focus = !renderer.scene.focus;
  renderer.scene.manualCenter = null;
  $("#view-mode").textContent = renderer.scene.focus
    ? "Całe pole"
    : "Zbliżenie frontu";
};
$("#recenter").onclick = () => {
  renderer.scene.focus = true;
  renderer.scene.manualCenter = null;
  $("#view-mode").textContent = "Całe pole";
};
$("#quality").onclick = () => {
  const wasPaused = sim?.paused;
  const prior = $("#modal-root").firstElementChild;
  if (sim) sim.paused = true;
  modal(
    `<span class="eyebrow">USTAWIENIA GRAFIKI</span><h1>Jakość i płynność</h1><p>Tryb automatyczny ogranicza efekty i rozdzielczość renderowania na telefonie. Statystyki, AI i tempo bitwy pozostają takie same.</p><div class="quality-options">${[
      ["auto", "Automatyczna"],
      ["high", "Wysoka · 60 FPS"],
      ["balanced", "Zrównoważona · 30 FPS"],
      ["low", "Oszczędna · 30 FPS"],
    ]
      .map(
        ([key, name]) =>
          `<button data-quality="${key}" class="${(quality.automatic ? "auto" : quality.key) === key ? "selected" : ""}">${name}</button>`,
      )
      .join(
        "",
      )}</div><p id="quality-state">Teraz: ${quality.profile.name}. ${quality.reason}. Podane FPS to limit, nie gwarancja urządzenia.</p><button id="quality-close" class="primary">WRÓĆ DO GRY</button>`,
  );
  document.querySelectorAll("[data-quality]").forEach(
    (button) =>
      (button.onclick = () => {
        quality.choose(button.dataset.quality);
        persist({ quality: button.dataset.quality });
        $("#quality").textContent = quality.automatic
          ? "AUTO"
          : quality.key === "high"
            ? "60"
            : "30";
        document
          .querySelectorAll("[data-quality]")
          .forEach((b) => b.classList.toggle("selected", b === button));
        $("#quality-state").textContent =
          `Teraz: ${quality.profile.name}. ${quality.reason}. Limit: ${quality.profile.fps} FPS.`;
      }),
  );
  $("#quality-close").onclick = () => {
    closeModal();
    if (prior) $("#modal-root").append(prior);
    if (sim) sim.paused = wasPaused;
  };
};
$("#help").onclick = () => showHelp(screen === "menu");
$("#audio").onclick = () => {
  sound.start();
  sound.mute(!sound.muted);
  $("#audio").innerHTML = icon(sound.muted ? "mute" : "sound");
  $("#audio").setAttribute(
    "aria-label",
    sound.muted ? "Włącz dźwięk" : "Wycisz dźwięk",
  );
  persist();
};
$("#speed").onclick = () => {
  speed = speed === 1 ? 2 : 1;
  $("#speed").textContent = `${speed}×`;
};
$("#pause").onclick = pause;
$("#resume").onclick = pause;
$("#abandon").onclick = () => {
  sim.result = "defeat";
  sound.event({ type: "end", result: "defeat" });
  $("#pause-label").classList.add("hidden");
  endGame();
};
$("#evolve").onclick = () => act(() => sim.evolve(0));
$('#assault').onclick=()=>act(()=>sim.assault(0));
$('#repair').onclick=()=>act(()=>sim.repair(0));
$("#special").onclick = () => act(() => sim.special(0));
document.querySelectorAll("[data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      tab = b.dataset.tab;
      renderCards();
    }),
);
$("#history").onclick = () => {
  const prior = $("#modal-root").firstElementChild;
  const wasPaused = sim?.paused;
  if (sim) sim.paused = true;
  const era = sim?.sides[0].era || 0;
  modal(
    `<span class="eyebrow">ARCHIWUM HISTORYCZNE · ${String(era + 1).padStart(2, "0")}</span><h1>${ERAS[era].name}</h1><p class="history-fact">${ERAS[era].fact}</p><p class="help-note">Przymierze Świtu i Dyrektorat Żelaza to fikcyjne koalicje. Przeskoki epok i relacje kontr są uproszczeniem służącym rozgrywce, nie symulacją historyczną.</p><button id="history-close" class="primary">WRÓĆ ${icon("arrow", 16)}</button>`,
  );
  $("#history-close").onclick = () => {
    closeModal();
    if (prior) $("#modal-root").append(prior);
    if (sim) sim.paused = wasPaused;
  };
};
window.addEventListener("keydown", (e) => {
  if (
    e.repeat ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    $("#modal-root").children.length
  )
    return;
  if (["1", "2", "3"].includes(e.key))
    act(() => sim.recruit(0, Number(e.key) - 1));
  if (e.code === "Space") {
    e.preventDefault();
    pause();
  }
  if(e.key.toLowerCase()==='r')$('#assault').click();
  if(e.key.toLowerCase()==='t')$('#repair').click();
  if (e.key.toLowerCase() === "e") $("#evolve").click();
  if (e.key.toLowerCase() === "q") $("#special").click();
  if (e.key.toLowerCase() === "f") $("#speed").click();
  if (e.key.toLowerCase() === "m") $("#audio").click();
  if (e.key.toLowerCase() === "h") $("#help").click();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && sim && screen === "battle" && !sim.paused) pause();
});
renderCards();
showMenu();
// Read-only diagnostics are useful for smoke tests and performance inspection.
window.bloodlines = {
  get simulation() {
    return sim;
  },
  get renderer() {
    return renderer;
  },
  get quality() {
    return quality;
  },
  get diagnostics() {
    return {
      canvas: "2d",
      profile: quality.key,
      fpsLimit: quality.profile.fps,
      paintMs: quality.lastPaintMs,
      paintedFrames: quality.paintedFrames,
      effects: renderer.scene.effects.length,
      pooledEffects: renderer.scene.effectPool.length,
      portraitCache: portraitCache.size,
      cachedSprites: renderer.scene.unitSprites.size,
      audioBuffers: sound.buffers?.size || 0,
      units: sim?.units.length || 0,
      canvases: [...document.querySelectorAll("canvas")].map((c) => ({
        width: c.width,
        height: c.height,
      })),
      heapBytes: performance.memory?.usedJSHeapSize || null,
    };
  },
};

// Offline support is optional and only registered on a secure hosted origin.
if (
  !window.BLOODLINES_STANDALONE &&
  "serviceWorker" in navigator &&
  window.isSecureContext &&
  location.protocol !== "file:" &&
  !import.meta.env.DEV
) {
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then(async (registration) => {
      const worker = registration.installing || registration.waiting;
      const announce = () => {
        if (!updateToastShown) {
          updateToastShown = true;
          toast(
            "Zasoby zapisane. Gra jest gotowa do uruchamiania offline pod tym samym adresem.",
          );
        }
      };
      if (registration.active) announce();
      worker?.addEventListener("statechange", () => {
        if (worker.state === "activated") announce();
      });
    })
    .catch(() => {
      toast("Tryb offline niedostępny. Gra przez internet nadal działa.");
    });
}

window.addEventListener("pagehide", () => {
  if (sim && screen === "battle" && !sim.paused) pause();
  sound.ctx?.suspend().catch(() => {});
});
