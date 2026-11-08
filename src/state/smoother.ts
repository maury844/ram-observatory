/**
 * Exponential smoothing of named numeric values toward targets, frame-rate independent:
 * value += (target − value) × (1 − e^(−dt/τ)). τ = 600 ms matches the design's easing.
 */
export class Smoother {
  private readonly values = new Map<string, number>();
  private readonly targets = new Map<string, number>();

  constructor(private readonly tauMs = 600) {}

  setTarget(key: string, target: number): void {
    this.targets.set(key, target);
    // First sighting snaps: no animating up from zero on load.
    if (!this.values.has(key)) this.values.set(key, target);
  }

  get(key: string): number | undefined {
    return this.values.get(key);
  }

  /** Where a value is heading. Use this for anything discrete (labels, images, copy). */
  target(key: string): number | undefined {
    return this.targets.get(key);
  }

  /** Advance by dt ms. Returns true if any value moved noticeably. */
  step(dtMs: number): boolean {
    const dt = Math.min(Math.max(dtMs, 0), 120); // background-tab jumps shouldn't overshoot
    const k = 1 - Math.exp(-dt / this.tauMs);
    let moved = false;
    for (const [key, target] of this.targets) {
      const v = this.values.get(key) ?? target;
      const diff = target - v;
      if (diff === 0) continue;
      // Settle exactly once within display precision, so step() goes quiet and DOM work stops.
      const next = Math.abs(diff) <= 1e-6 * Math.max(1, Math.abs(target)) ? target : v + diff * k;
      this.values.set(key, next);
      moved = true;
    }
    return moved;
  }

  /** Jump every value to its target (reduced motion, or first paint). */
  snap(): void {
    for (const [key, target] of this.targets) this.values.set(key, target);
  }
}
