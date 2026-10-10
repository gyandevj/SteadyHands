import type { SelectionEvent } from '../types.ts';

export const DwellState = {
  IDLE: 'IDLE',
  CANDIDATE_ACQUIRED: 'CANDIDATE_ACQUIRED',
  DWELLING: 'DWELLING',
  ACTIVATED: 'ACTIVATED',
  REARM_PENDING: 'REARM_PENDING',
  COOLDOWN: 'COOLDOWN',
} as const;

export type DwellState = (typeof DwellState)[keyof typeof DwellState];

export interface DwellStepResult {
  readonly state: DwellState;
  readonly progress: number;
  readonly selection: SelectionEvent | null;
}
