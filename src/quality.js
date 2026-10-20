export const PROFILES = {
  high: {
    name: "Wysoka",
    fps: 60,
    scale: 1,
    dust: 7,
    rain: 48,
    fragments: 17,
    effects: 150,
  },
  balanced: {
    name: "Zrównoważona",
    fps: 30,
    scale: 0.8,
    dust: 3,
    rain: 20,
    fragments: 12,
    effects: 90,
  },
  low: {
    name: "Oszczędna",
    fps: 30,
    scale: 0.6,
    dust: 0,
    rain: 10,
    fragments: 8,
    effects: 60,
  },
};
export function initialQuality({
  mobile = false,
  cores = 8,
  reducedMotion = false,
} = {}) {
  return mobile ? (cores <= 4 || reducedMotion ? "low" : "balanced") : "high";
}
export class AdaptiveQuality {
  constructor(environment = {}) {
    this.mobile = !!environment.mobile;
    this.automatic = true;
    this.key = initialQuality(environment);
    this.base = this.key;
    this.samples = [];
    this.changes = 0;
    this.reason = "Profil początkowy";
    this.paintedFrames = 0;
    this.lastPaintMs = 0;
  }
  get profile() {
    return PROFILES[this.key];
  }
  choose(value) {
    this.automatic = value === "auto";
    this.key = this.automatic ? this.base : PROFILES[value] ? value : this.base;
    this.samples.length = 0;
    this.reason = this.automatic
      ? "Automatyczny dobór jakości"
      : "Wybór gracza";
    this.changes++;
  }
  sample(ms, frameMs = 0) {
    this.paintedFrames++;
    this.lastPaintMs = ms;
    if (!this.automatic || this.key === "low") return;
    this.samples.push({ paint: ms, frame: frameMs });
    if (this.samples.length < 90) return;
    const average =
      this.samples.reduce((a, b) => a + b.paint, 0) / this.samples.length;
    const cadence =
      this.samples.reduce((a, b) => a + b.frame, 0) / this.samples.length;
    this.samples.length = 0;
    if (
      cadence > (1000 / this.profile.fps) * 1.4 ||
      average > (1000 / this.profile.fps) * 0.7
    ) {
      this.key = this.key === "high" ? "balanced" : "low";
      this.changes++;
      this.reason = `Obniżono obciążenie renderowania (${average.toFixed(1)} ms/klatkę)`;
    }
  }
}
export function browserEnvironment() {
  return {
    mobile:
      matchMedia("(pointer: coarse)").matches && navigator.maxTouchPoints > 0,
    cores: navigator.hardwareConcurrency || 4,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}
