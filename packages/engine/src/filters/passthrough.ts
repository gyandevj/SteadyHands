import type { Point } from '../types.ts';
import type { IPointerFilter } from './types.ts';

/**
 * Raw passthrough filter for developer testing ('raw_virtual' mode).
 * Retains zero smoothing and zero delay.
 */
export class PassthroughFilter implements IPointerFilter {
  public readonly name = 'passthrough';

  public filter(point: Point): Point {
    return {
      x: point.x,
      y: point.y,
      tMs: point.tMs,
    };
  }

  public reset(): void {
    // Stateless; no action required.
  }
}
