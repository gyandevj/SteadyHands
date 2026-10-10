import type { Point } from '../types.ts';
import type { IPointerFilter } from './types.ts';

/**
 * 1€ Filter (One Euro Filter) for speed-adaptive low-pass pointer filtering.
 * Casiez, Roussel, Vogel (CHI 2012): "1 € Filter: A Simple Speed-based Low-pass
 * Filter for Noisy Input in Interactive Systems".
 *
 * Dynamically adjusts cutoff frequency:
 *   f_c = f_{c,min} + beta * speed
 * where speed is estimated using a derivative low-pass filter (cutoff dCutoffHz).
 */
export class OneEuroFilter implements IPointerFilter {
  public readonly name = 'one_euro';

  private minCutoffHz: number;
  private beta: number;
  private dCutoffHz: number;

  private prevPoint: Point | null = null;
  private dxHat: number = 0;
  private dyHat: number = 0;

  constructor(
    minCutoffHz: number = 1.0,
    beta: number = 0.005,
    dCutoffHz: number = 1.0
  ) {
    this.minCutoffHz = Math.max(0.1, Math.min(20.0, minCutoffHz));
    this.beta = Math.max(0.0, Math.min(1.0, beta));
    this.dCutoffHz = Math.max(0.1, Math.min(10.0, dCutoffHz));
  }

  public setParameters(params: {
    minCutoffHz?: number;
    beta?: number;
    dCutoffHz?: number;
  }): void {
    if (params.minCutoffHz !== undefined) {
      this.minCutoffHz = Math.max(0.1, Math.min(20.0, params.minCutoffHz));
    }
    if (params.beta !== undefined) {
      this.beta = Math.max(0.0, Math.min(1.0, params.beta));
    }
    if (params.dCutoffHz !== undefined) {
      this.dCutoffHz = Math.max(0.1, Math.min(10.0, params.dCutoffHz));
    }
  }

  public getParameters(): { minCutoffHz: number; beta: number; dCutoffHz: number } {
    return {
      minCutoffHz: this.minCutoffHz,
      beta: this.beta,
      dCutoffHz: this.dCutoffHz,
    };
  }

  private computeAlpha(cutoffHz: number, dtSec: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoffHz);
    return 1.0 / (1.0 + tau / dtSec);
  }

  public filter(point: Point): Point {
    // 1. Sanity check finite inputs
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.tMs)) {
      return this.prevPoint ?? { x: 0, y: 0, tMs: 0 };
    }

    // 2. Initial sample initialization
    if (this.prevPoint === null) {
      this.prevPoint = { x: point.x, y: point.y, tMs: point.tMs };
      this.dxHat = 0;
      this.dyHat = 0;
      return this.prevPoint;
    }

    // 3. Compute time delta in seconds
    const dtMs = point.tMs - this.prevPoint.tMs;
    const dtSec = dtMs / 1000.0;

    // 4. Duplicate or backwards timestamps
    if (dtMs <= 0) {
      return {
        x: this.prevPoint.x,
        y: this.prevPoint.y,
        tMs: point.tMs,
      };
    }

    // 5. Large time gap (pause / backgrounded tab > 1s)
    if (dtSec > 1.0) {
      this.prevPoint = { x: point.x, y: point.y, tMs: point.tMs };
      this.dxHat = 0;
      this.dyHat = 0;
      return this.prevPoint;
    }

    // 6. Estimate raw derivative
    const rawDx = (point.x - this.prevPoint.x) / dtSec;
    const rawDy = (point.y - this.prevPoint.y) / dtSec;

    // 7. Filter derivative with derivative cutoff
    const alphaD = this.computeAlpha(this.dCutoffHz, dtSec);
    this.dxHat = this.dxHat + alphaD * (rawDx - this.dxHat);
    this.dyHat = this.dyHat + alphaD * (rawDy - this.dyHat);

    // 8. Compute speed and clamp to prevent numerical instability
    const speed = Math.min(10000.0, Math.hypot(this.dxHat, this.dyHat));

    // 9. Speed-adaptive cutoff frequency
    const cutoff = Math.max(0.1, Math.min(20.0, this.minCutoffHz + this.beta * speed));

    // 10. Filter position with adaptive cutoff
    const alpha = this.computeAlpha(cutoff, dtSec);
    const filteredX = this.prevPoint.x + alpha * (point.x - this.prevPoint.x);
    const filteredY = this.prevPoint.y + alpha * (point.y - this.prevPoint.y);

    this.prevPoint = {
      x: filteredX,
      y: filteredY,
      tMs: point.tMs,
    };

    return this.prevPoint;
  }

  public reset(point?: Point): void {
    this.dxHat = 0;
    this.dyHat = 0;
    if (point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.tMs)) {
      this.prevPoint = { x: point.x, y: point.y, tMs: point.tMs };
    } else {
      this.prevPoint = null;
    }
  }
}
