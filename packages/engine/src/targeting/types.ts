import type { Target } from '../types.ts';

export interface TargetDistance {
  readonly target: Target;
  readonly distance: number;
}

export interface CandidateDecision {
  readonly candidateId: string | null;
  readonly ambiguous: boolean;
}
