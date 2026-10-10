import { Point } from '../types/index.js';

export class SyntheticPointerStress {
  private enabled = false;
  private seed = 42;
  private amplitudePx = 4;

  setEnabled(enabled: boolean, amplitudePx = 4, seed = 42): void {
    this.enabled = enabled;
    this.amplitudePx = amplitudePx;
    this.seed = seed;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  perturb(p: Point): Point {
    if (!this.enabled) return p;

    // Deterministic pseudo-random jitter
    this.seed = (this.seed * 9301 + 49297) % 233280;
    const rndX = (this.seed / 233280.0) * 2 - 1;
    this.seed = (this.seed * 9301 + 49297) % 233280;
    const rndY = (this.seed / 233280.0) * 2 - 1;

    return {
      x: p.x + rndX * this.amplitudePx,
      y: p.y + rndY * this.amplitudePx,
      tMs: p.tMs
    };
  }
}

export const syntheticPointer = new SyntheticPointerStress();
