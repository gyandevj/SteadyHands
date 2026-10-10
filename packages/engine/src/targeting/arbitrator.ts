import type { Point, Target, TargetConfig } from '../types.ts';
import type { CandidateDecision, TargetDistance } from './types.ts';
import { distanceToRect } from './distance.ts';

export class TargetArbitrator {
  private activeCandidateId: string | null = null;

  public arbitrate(
    pointer: Point,
    targets: readonly Target[],
    config: TargetConfig,
    instantSpeedPxPerSec: number = 0
  ): CandidateDecision {
    // 1. Filter enabled interactive targets
    const validTargets = targets.filter((t) => t.enabled);
    if (validTargets.length === 0) {
      this.activeCandidateId = null;
      return { candidateId: null, ambiguous: false };
    }

    // 2. Determine hysteresis allowance
    // High-speed deliberate departure resets hysteresis to 0
    const isEscaping = instantSpeedPxPerSec > 600;
    const hysteresisPx = isEscaping ? 0 : 6;

    // 3. Compute distances to boundaries
    const scored: TargetDistance[] = [];
    for (const target of validTargets) {
      const d = distanceToRect(pointer, target.rect);
      const effectiveRadius =
        target.id === this.activeCandidateId
          ? config.capture_radius_px + hysteresisPx
          : config.capture_radius_px;

      if (d <= effectiveRadius) {
        scored.push({ target, distance: d });
      }
    }

    // No target within effective radius
    if (scored.length === 0) {
      this.activeCandidateId = null;
      return { candidateId: null, ambiguous: false };
    }

    // 4. Sort by distance ascending; tie-break by area or current active candidate
    scored.sort((a, b) => {
      const diff = a.distance - b.distance;
      if (Math.abs(diff) > 0.001) {
        return diff;
      }
      // Prefer currently active candidate
      if (a.target.id === this.activeCandidateId) return -1;
      if (b.target.id === this.activeCandidateId) return 1;
      // Prefer smaller target area (finer control)
      const areaA = a.target.rect.width * a.target.rect.height;
      const areaB = b.target.rect.width * b.target.rect.height;
      return areaA - areaB;
    });

    // 5. Ambiguity evaluation
    if (scored.length >= 2) {
      const d1 = scored[0].distance;
      const d2 = scored[1].distance;
      const distanceDifference = Math.abs(d2 - d1);

      if (distanceDifference < config.ambiguity_margin_px) {
        // Targets are too close to arbitrate safely
        this.activeCandidateId = null;
        return { candidateId: null, ambiguous: true };
      }
    }

    // 6. Selected unique candidate
    this.activeCandidateId = scored[0].target.id;
    return {
      candidateId: this.activeCandidateId,
      ambiguous: false,
    };
  }

  public getActiveCandidateId(): string | null {
    return this.activeCandidateId;
  }

  public reset(): void {
    this.activeCandidateId = null;
  }
}
