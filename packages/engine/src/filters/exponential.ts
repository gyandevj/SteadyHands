import type { Point } from '../types.ts';
import type { IPointerFilter } from './types.ts';

/**
 * Time-aware first-order exponential low-pass filter.
 * Discrete recurrence: x_hat[k] = x_hat[k-1] + alpha * (x[k] - x_hat[k-1])
 * where alpha = 1 - exp(-2 * PI * cutoff_hz * dt_sec)
 */
export class ExponentialFilter implements IPointerFilter {
  public readonly name = 'exponential';
  private cutoffHz: number;
  private prevPoint: Point | null = null;

  constructor(cutoffHz: number = 1.0) {
    this.cutoffHz = Math.max(0.1, Math.min(20.0, cutoffHz));
  }

  public setCutoff(cutoffHz: number): void {
    this.cutoffHz = Math.max(0.1, Math.min(20.0, cutoffHz));
  }

  public getCutoff(): number {
    return this.cutoffHz;
  }

  public filter(point: Point): Point {
    // 1. Sanity check finite inputs
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.tMs)) {
      return this.prevPoint ?? { x: 0, y: 0, tMs: 0 };
    }

    // 2. Initial sample initialization
    if (this.prevPoint === null) {
      this.prevPoint = { x: point.x, y: point.y, tMs: point.tMs };
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
      return this.prevPoint;
    }

    // 6. Exponential smoothing coefficient
    const alpha = 1.0 - Math.exp(-2.0 * Math.PI * this.cutoffHz * dtSec);
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
    if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
      this.prevPoint = { x: point.x, y: point.y, tMs: point.tMs };
    } else {
      this.prevPoint = null;
    }
  }
}
