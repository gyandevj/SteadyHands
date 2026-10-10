import {
  Point,
  EngineInput,
  EngineOutput,
  InteractionEngine,
  AssistanceConfig,
  DEFAULT_ASSISTANCE_CONFIG
} from '../types/index.js';

export class LocalInteractionEngine implements InteractionEngine {
  private config: AssistanceConfig = { ...DEFAULT_ASSISTANCE_CONFIG };
  private filteredX = 0;
  private filteredY = 0;
  private lastTimeMs = 0;
  private hasPreviousPoint = false;

  // Dwell state machine
  private dwellTargetId: string | null = null;
  private dwellStartTimeMs = 0;
  private dwellActivated = false;
  private dwellRearmed = true;
  private lastSelectionId: string | null = null;

  constructor(config: AssistanceConfig = DEFAULT_ASSISTANCE_CONFIG) {
    this.config = { ...config };
  }

  applyConfig(config: AssistanceConfig): void {
    this.config = { ...config };
    this.cancel('config_applied');
  }

  reset(point: Point): void {
    this.filteredX = point.x;
    this.filteredY = point.y;
    this.lastTimeMs = point.tMs;
    this.hasPreviousPoint = true;
    this.cancel('reset');
  }

  cancel(_reason: string): void {
    this.dwellTargetId = null;
    this.dwellStartTimeMs = 0;
    this.dwellActivated = false;
    // Don't reset rearmed here; user must exit capture radius to rearm
  }

  step(input: EngineInput): EngineOutput {
    const raw = input.raw;
    const nowMs = raw.tMs;

    // 1. Filter pointer coordinates
    if (!this.hasPreviousPoint) {
      this.filteredX = raw.x;
      this.filteredY = raw.y;
      this.lastTimeMs = nowMs;
      this.hasPreviousPoint = true;
    } else {
      const dtMs = Math.max(nowMs - this.lastTimeMs, 1);
      this.lastTimeMs = nowMs;

      if (this.config.mode === 'stabilized') {
        // Exponential / One Euro smoothing
        const alpha = Math.min(Math.max(dtMs / (dtMs + 35), 0.05), 1.0);
        this.filteredX += alpha * (raw.x - this.filteredX);
        this.filteredY += alpha * (raw.y - this.filteredY);
      } else {
        // Native / Raw Virtual bypass
        this.filteredX = raw.x;
        this.filteredY = raw.y;
      }
    }

    const currentPointer: Point = {
      x: Math.round(this.filteredX),
      y: Math.round(this.filteredY),
      tMs: nowMs
    };

    // 2. Candidate target arbitration with hysteresis
    let candidateId: string | null = null;
    let shortestDistance = Infinity;
    let secondShortestDistance = Infinity;
    const captureRadius = this.config.target.capture_radius_px;
    const ambiguityMargin = this.config.target.ambiguity_margin_px;

    for (const target of input.targets) {
      if (!target.enabled) continue;

      const dist = this.distanceToRect(currentPointer, target.rect);
      // Allow 12px hysteresis buffer for the currently active dwell target to resist tremor jitter
      const effectiveRadius = target.id === this.dwellTargetId ? captureRadius + 12 : captureRadius;
      if (dist <= effectiveRadius) {
        if (dist < shortestDistance) {
          secondShortestDistance = shortestDistance;
          shortestDistance = dist;
          candidateId = target.id;
        } else if (dist < secondShortestDistance) {
          secondShortestDistance = dist;
        }
      }
    }

    const isAmbiguous =
      candidateId !== null &&
      secondShortestDistance <= captureRadius &&
      secondShortestDistance - shortestDistance < ambiguityMargin;

    // 3. Dwell progress and selection
    let dwellProgress = 0;
    let selection = null;

    if (!this.config.dwell.enabled || !candidateId || isAmbiguous) {
      // Dwell cancelled or target lost
      this.dwellTargetId = null;
      this.dwellStartTimeMs = 0;
      this.dwellActivated = false;
      this.dwellRearmed = true;
    } else {
      const candidateTarget = input.targets.find((t) => t.id === candidateId);
      const dwellAllowed = candidateTarget?.dwellAllowed ?? false;

      if (!dwellAllowed) {
        // Dwell not allowed for this target kind (e.g. submit button)
        this.dwellTargetId = null;
        this.dwellStartTimeMs = 0;
        this.dwellActivated = false;
      } else if (this.dwellTargetId !== candidateId) {
        // Target switched or entered
        this.dwellTargetId = candidateId;
        this.dwellStartTimeMs = nowMs;
        this.dwellActivated = false;
        this.dwellRearmed = true;
      } else if (this.dwellActivated) {
        // Already activated; dwell progress remains full until exit
        dwellProgress = 1.0;
      } else if (this.dwellRearmed) {
        const elapsed = nowMs - this.dwellStartTimeMs;
        dwellProgress = Math.min(Math.max(elapsed / this.config.dwell.duration_ms, 0), 1.0);

        if (elapsed >= this.config.dwell.duration_ms) {
          this.dwellActivated = true;
          this.dwellRearmed = false;
          dwellProgress = 1.0;
          this.lastSelectionId = `sel-${nowMs}-${Math.random().toString(36).substring(2, 7)}`;
          selection = {
            id: this.lastSelectionId,
            targetId: candidateId
          };
        }
      }
    }

    return {
      pointer: currentPointer,
      candidateId: isAmbiguous ? null : candidateId,
      ambiguous: isAmbiguous,
      dwellProgress,
      selection
    };
  }

  private distanceToRect(p: Point, rect: { x: number; y: number; width: number; height: number }): number {
    const dx = Math.max(rect.x - p.x, 0, p.x - (rect.x + rect.width));
    const dy = Math.max(rect.y - p.y, 0, p.y - (rect.y + rect.height));
    return Math.sqrt(dx * dx + dy * dy);
  }
}
