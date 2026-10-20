export const WORLD = 1600;
export const MAX_UNITS = 28;
export const DIFFICULTIES = {
  easy: {
    name: "Rekrut",
    decision: 3.6,
    income: 0.85,
    description: "Wolniejsze decyzje AI · dochód przeciwnika −15%",
  },
  normal: {
    name: "Dowódca",
    decision: 2.2,
    income: 1,
    description: "Równe zasady · adaptacyjny przeciwnik",
  },
  hard: {
    name: "Weteran",
    decision: 1.1,
    income: 1.12,
    description: "Szybsze decyzje AI · dochód przeciwnika +12%",
  },
};
export const ERAS = [
  {
    name: "Prehistoria",
    date: "10 000 p.n.e.",
    short: "PLEMIĘ",
    color: "#b89669",
    xp: 100,
    units: ["Maczugowiec", "Oszczepnik", "Tarczownik"],
    classes: ["infantry", "ranged", "heavy"],
    weapons: ["club", "spear", "club"],
    defense: ["Kamienny miotacz", "Wieża oszczepników"],
    special: "Grad kamieni",
    fact: "Kamienne narzędzia i broń drzewcowa poprzedzają powstanie pierwszych państw. Frakcje w grze są fikcyjne.",
  },
  {
    name: "Starożytność",
    date: "500 p.n.e.",
    short: "REPUBLIKA",
    color: "#bcb197",
    xp: 160,
    units: ["Hoplita", "Łucznik", "Rydwan"],
    classes: ["infantry", "ranged", "heavy"],
    weapons: ["spear", "bow", "chariot"],
    defense: ["Balista", "Wieża łuczników"],
    special: "Salwa łuczników",
    fact: "Hoplita walczył w zwartej formacji. Rydwany miały różne zastosowania zależnie od okresu i regionu.",
  },
  {
    name: "Średniowiecze",
    date: "1200",
    short: "KRÓLESTWO",
    color: "#9ba68b",
    xp: 230,
    units: ["Pikinier", "Kusznik", "Ciężki rycerz"],
    classes: ["infantry", "ranged", "heavy"],
    weapons: ["pike", "crossbow", "sword"],
    defense: ["Mangonela", "Wieża kuszników"],
    special: "Ostrzał machin",
    fact: "Piki, kusze i ciężka jazda współistniały. Ich skuteczność zależała od terenu, wyszkolenia i współdziałania.",
  },
  {
    name: "Epoka prochu",
    date: "1650",
    short: "IMPERIUM",
    color: "#ae957c",
    xp: 320,
    units: ["Halabardnik", "Muszkieter", "Działo"],
    classes: ["infantry", "ranged", "siege"],
    weapons: ["pike", "musket", "cannon"],
    defense: ["Moździerz", "Bastion muszkietów"],
    special: "Salwa artyleryjska",
    fact: "Wczesne armie prochowe łączyły strzelców z formacjami pikinierskimi. Rozwój artylerii zmieniał fortyfikacje.",
  },
  {
    name: "Rewolucja przemysłowa",
    date: "1870",
    short: "REPUBLIKA",
    color: "#91a1a2",
    xp: 430,
    units: ["Saper", "Strzelec", "Armata polowa"],
    classes: ["infantry", "ranged", "siege"],
    weapons: ["shovel", "rifle", "cannon"],
    defense: ["Bateria artylerii", "Gniazdo strzelców"],
    special: "Bombardowanie",
    fact: "Kolej, telegraf i produkcja przemysłowa zmieniły logistykę. Artyleria gwintowana zwiększyła zasięg ognia.",
  },
  {
    name: "Wojny światowe",
    date: "1939",
    short: "KOALICJA",
    color: "#a1a38a",
    xp: 560,
    units: ["Piechur", "Ciężki karabin", "Czołg"],
    classes: ["infantry", "ranged", "heavy"],
    weapons: ["rifle", "mg", "tank"],
    defense: ["Działo ppanc.", "Bunkier CKM"],
    special: "Nalot bombowy",
    fact: "Wojny światowe przyspieszyły rozwój broni połączonych: piechoty, artylerii, wojsk pancernych i lotnictwa.",
  },
  {
    name: "Zimna wojna",
    date: "1975",
    short: "SOJUSZ",
    color: "#86a68d",
    xp: 720,
    units: ["Szturmowiec", "Strzelec wyborowy", "Transporter"],
    classes: ["infantry", "ranged", "heavy"],
    weapons: ["rifle", "sniper", "apc"],
    defense: ["Wyrzutnia ppanc.", "Wieża obserwacyjna"],
    special: "Atak rakietowy",
    fact: "W okresie zimnej wojny rozwijały się pociski kierowane i rozpoznanie. Transportery zwiększały mobilność piechoty.",
  },
  {
    name: "Współczesność",
    date: "2020 — 2026",
    short: "KOALICJA",
    color: "#90a49e",
    xp: Infinity,
    units: ["Piechota nowoczesna", "Operator FPV", "Wóz bojowy"],
    classes: ["infantry", "drone", "heavy"],
    weapons: ["rifle", "drone", "ifv"],
    defense: ["Działo automatyczne", "System przeciwdronowy"],
    special: "Rój dronów FPV",
    fact: "W wojnie Rosji przeciw Ukrainie szeroko wykorzystuje się drony i walkę elektroniczną. Gra upraszcza te mechanizmy; nie korzysta z wiadomości na żywo.",
  },
];
const BASE = [
  {
    hp: 135,
    damage: 22,
    range: 30,
    speed: 64,
    interval: 1.0,
    cost: 65,
    training: 1.7,
    armor: 0.04,
    type: "impact",
  },
  {
    hp: 76,
    damage: 19,
    range: 205,
    speed: 49,
    interval: 1.45,
    cost: 95,
    training: 2.4,
    armor: 0,
    type: "piercing",
  },
  {
    hp: 350,
    damage: 35,
    range: 38,
    speed: 33,
    interval: 1.8,
    cost: 165,
    training: 3.8,
    armor: 0.3,
    type: "impact",
  },
];
export function unitStats(era, slot) {
  const b = BASE[slot],
    cls = ERAS[era].classes[slot],
    factor = 1.24 ** era;
  return {
    ...b,
    name: ERAS[era].units[slot],
    cls,
    weapon: ERAS[era].weapons[slot],
    era,
    slot,
    radius: ["tank", "apc", "ifv", "cannon", "chariot"].includes(ERAS[era].weapons[slot]) ? 28 : 11,
    hp: Math.round(b.hp * factor),
    damage: Math.round(b.damage * factor),
    cost: Math.round(b.cost * 1.17 ** era),
    range:
      cls === "siege"
        ? 285
        : cls === "drone"
          ? 250
          : slot === 1
            ? 205 + era * 9
            : slot === 0 && era >= 5
              ? 125
              : slot === 2 && era >= 5
                ? 175
                : b.range,
    speed: cls === "heavy" && era >= 5 ? 39 : b.speed,
    type:
      cls === "siege" || cls === "drone"
        ? "explosive"
        : era >= 3 && slot === 1
          ? "ballistic"
          : b.type,
    interval: cls === "siege" ? 3.0 : cls === "drone" ? 2.6 : b.interval,
  };
}
export function damageAgainst(attacker, defender, multiplier = 1) {
  let counter = 1;
  if (attacker.cls === "infantry" && defender.cls === "heavy") counter = 1.7;
  if (attacker.cls === "ranged" && defender.cls === "infantry") counter = 1.5;
  if (attacker.cls === "heavy" && defender.cls === "ranged") counter = 1.6;
  if (attacker.cls === "siege" && defender.cls === "infantry") counter = 0.65;
  if (attacker.cls === "drone" && defender.cls === "heavy") counter = 1.65;
  return Math.max(
    1,
    attacker.damage * counter * (1 - (defender.armor || 0)) * multiplier,
  );
}
export const CLASS_NAMES = {
  infantry: "Piechota",
  ranged: "Dystansowa",
  heavy: "Ciężka",
  siege: "Oblężnicza",
  drone: "Drony",
};
export const COUNTERS = {
  infantry: "Kontruje ciężkie jednostki. Podatna na ostrzał.",
  ranged: "Kontruje piechotę. Wymaga osłony.",
  heavy: "Przełamuje strzelców. Podatna na piechotę.",
  siege: "Burzy bazy, razi grupy. Wymaga eskorty.",
  drone: "Zwalcza pojazdy. Podatny na zakłócanie i obronę przeciwlotniczą.",
};
export function defenseStats(era, type) {
  return {
    name: ERAS[era].defense[type],
    cost: Math.round((type ? 220 : 290) * 1.15 ** era),
    range: type ? 320 : 395,
    damage: (type ? 17 : 43) * 1.24 ** era,
    interval: type ? 0.85 : 2.8,
  };
}
