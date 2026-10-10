import type { DwellConfig, SelectionEvent } from '../types.ts';
import { DwellState, type DwellStepResult } from './types.ts';

export class DwellStateMachine {
  private state: DwellState = DwellState.IDLE;
  private currentTargetId: string | null = null;
  private dwellStartTimeMs: number = 0;
  private lastStepTimeMs: number = 0;
  private lastExitTimeMs: number = 0;
  private lockedTargetId: string | null = null;
  private selectionCounter: number = 0;

  public step(
    candidateId: string | null,
    dwellAllowed: boolean,
    tMs: number,
    config: DwellConfig
  ): DwellStepResult {
    // 1. Dwell disabled globally
    if (!config.enabled) {
      this.cancel('dwell_disabled');
      return { state: DwellState.IDLE, progress: 0.0, selection: null };
    }

    // 2. Sudden time gap check (>1s sleep/tab switch aborts dwell)
    if (this.lastStepTimeMs > 0 && tMs - this.lastStepTimeMs > 1000) {
      this.cancel('time_gap');
    }
    this.lastStepTimeMs = tMs;

    // 3. Check if target candidate changed
    if (candidateId !== this.currentTargetId) {
      if (this.currentTargetId !== null && this.currentTargetId === this.lockedTargetId) {
        // User left the activated/locked target -> enter COOLDOWN and record exit timestamp
        this.lastExitTimeMs = tMs;
        this.state = DwellState.COOLDOWN;
      } else if (this.lockedTargetId === null) {
        // User left an unactivated target -> reset to IDLE
        this.state = DwellState.IDLE;
      }
      this.currentTargetId = candidateId;
      this.dwellStartTimeMs = tMs;
    }

    // 4. Check if cooldown lock has expired
    if (this.lockedTargetId !== null && this.state === DwellState.COOLDOWN) {
      if (tMs - this.lastExitTimeMs >= config.rearm_ms) {
        this.lockedTargetId = null;
        this.state = DwellState.IDLE;
      }
    }

    // 5. No candidate or not dwell-allowed
    if (candidateId === null || !dwellAllowed) {
      const returnState = this.lockedTargetId !== null ? DwellState.COOLDOWN : DwellState.IDLE;
      this.state = returnState;
      return { state: returnState, progress: 0.0, selection: null };
    }

    // 6. Target is currently locked (prevent repeated activation while hovering)
    if (candidateId === this.lockedTargetId) {
      this.state = DwellState.REARM_PENDING;
      return {
        state: DwellState.REARM_PENDING,
        progress: 1.0,
        selection: null,
      };
    }

    // 7. Advance dwell state machine
    switch (this.state) {
      case DwellState.IDLE:
      case DwellState.COOLDOWN:
        this.state = DwellState.CANDIDATE_ACQUIRED;
        this.dwellStartTimeMs = tMs;
        return { state: this.state, progress: 0.0, selection: null };

      case DwellState.CANDIDATE_ACQUIRED:
      case DwellState.DWELLING: {
        const elapsed = tMs - this.dwellStartTimeMs;
        const progress = Math.min(1.0, Math.max(0.0, elapsed / config.duration_ms));

        if (progress >= 1.0) {
          // Exactly-once selection event emission
          this.lockedTargetId = candidateId;
          this.state = DwellState.REARM_PENDING;
          const selection: SelectionEvent = {
            id: `sel-${Math.floor(tMs)}-${++this.selectionCounter}`,
            targetId: candidateId,
          };
          return {
            state: DwellState.ACTIVATED,
            progress: 1.0,
            selection,
          };
        }

        this.state = DwellState.DWELLING;
        return {
          state: this.state,
          progress,
          selection: null,
        };
      }

      case DwellState.ACTIVATED:
      case DwellState.REARM_PENDING:
        this.state = DwellState.REARM_PENDING;
        return {
          state: DwellState.REARM_PENDING,
          progress: 1.0,
          selection: null,
        };
    }
  }

  public cancel(reason: string): void {
    if (this.lockedTargetId !== null) {
      this.state = DwellState.COOLDOWN;
      this.lastExitTimeMs = this.lastStepTimeMs;
    } else {
      this.state = DwellState.IDLE;
    }
    this.currentTargetId = null;
    this.dwellStartTimeMs = 0;
  }

  public reset(): void {
    this.state = DwellState.IDLE;
    this.currentTargetId = null;
    this.lockedTargetId = null;
    this.dwellStartTimeMs = 0;
    this.lastStepTimeMs = 0;
    this.lastExitTimeMs = 0;
  }

  public getState(): DwellState {
    return this.state;
  }
}
