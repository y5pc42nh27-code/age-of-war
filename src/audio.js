export class AudioSystem {
  constructor() {
    this.muted = false;
    this.ctx = null;
    this.buffers = new Map();
    this.unavailable = false;
    this.musicClock = 0;
    this.lastShot = 0;
  }
  start() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        this.unavailable = true;
        return false;
      }
      if (!this.ctx || this.ctx.state === "closed") {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.22;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state !== "running")
        this.ctx.resume().catch(() => {
          this.unavailable = true;
        });
      return true;
    } catch {
      this.ctx = null;
      this.unavailable = true;
      return false;
    }
  }

  mute(value) {
    this.muted = value;
    if (this.master)
      this.master.gain.setTargetAtTime(
        value ? 0 : 0.22,
        this.ctx.currentTime,
        0.1,
      );
  }
  tone(freq, duration = 0.12, type = "sine", volume = 0.2, delay = 0) {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime + delay,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(
      Math.max(25, freq * 0.65),
      t + duration,
    );
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + duration);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  noise(duration = 0.15, volume = 0.4, cutoff = 1100) {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const count = Math.floor(this.ctx.sampleRate * duration);
    const key = `${count}`;
    let buffer = this.buffers.get(key);
    if (!buffer) {
      buffer = this.ctx.createBuffer(1, count, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < count; i++)
        data[i] = (Math.random() * 2 - 1) * (1 - i / count);
      if (this.buffers.size >= 8) this.buffers.clear();
      this.buffers.set(key, buffer);
    }
    const source = this.ctx.createBufferSource(),
      g = this.ctx.createGain(),
      filter = this.ctx.createBiquadFilter();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    g.gain.value = volume;
    source.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    source.start();
    source.onended = () => {
      source.disconnect();
      g.disconnect();
      filter.disconnect();
    };
  }
  event(e) {
    if (e.type === "recruit" && e.side === 0) {
      this.tone(320, 0.1, "triangle", 0.22);
      this.tone(480, 0.15, "triangle", 0.18, 0.08);
    }
    if (
      e.type === "shot" &&
      this.ctx &&
      this.ctx.currentTime - this.lastShot > 0.08
    ) {
      this.lastShot = this.ctx.currentTime;
      if (e.era < 3) {
        this.noise(0.07, 0.18, 650);
        this.tone(110, 0.05, "triangle", 0.1);
      } else this.noise(0.14, 0.4, 1800);
    }
    if (e.type === "base-hit") {
      this.tone(72, 0.25, "triangle", 0.16);
    }
    if (e.type === "impact") {
      this.noise(0.75, 0.7, 550);
      this.tone(65, 0.8, "sine", 0.6);
    }
    if (e.type === "evolve") {
      [220, 277, 330, 440].forEach((f, i) =>
        this.tone(f, 0.8, "triangle", 0.18, i * 0.13),
      );
    }
    if (e.type === "end") {
      (e.result === "victory"
        ? [261, 330, 392, 523]
        : [220, 196, 164, 110]
      ).forEach((f, i) => this.tone(f, 0.8, "triangle", 0.3, i * 0.25));
    }
  }
  music(dt, era = 0) {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    this.musicClock -= dt;
    if (this.musicClock > 0) return;
    this.musicClock = 3.8;
    const roots = [55, 65.4, 49, 58.3];
    const root = roots[Math.floor(this.ctx.currentTime / 15) % 4];
    this.tone(root, 3.7, "sine", 0.19);
    this.tone(root * 1.5, 3.5, "sine", 0.07, 0.15);
    if (era > 3) this.noise(0.17, 0.1, 180);
  }
}
