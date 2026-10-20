// Carry fractional frame time instead of discarding it after a limited frame.
// Simulation consumes each millisecond once, independently of presentation FPS.
export class FramePacer {
  constructor() {
    this.debt = 0;
    this.pending = 0;
  }
  advance(delta, fps) {
    this.debt += delta;
    this.pending += delta;
    const budget = 1000 / fps;
    if (this.debt + 0.15 < budget) return 0;
    this.debt = Math.max(0, this.debt - budget);
    if (this.debt > budget) this.debt %= budget;
    const elapsed = this.pending;
    this.pending = 0;
    return elapsed;
  }
}
