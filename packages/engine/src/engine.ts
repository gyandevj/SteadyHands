import type {
  AssistanceConfig,
  EngineInput,
  EngineOutput,
  InteractionEngine,
  Point,
} from './types.ts';
import type { IPointerFilter } from './filters/types.ts';
import { PassthroughFilter } from './filters/passthrough.ts';
import { ExponentialFilter } from './filters/exponential.ts';
import { OneEuroFilter } from './filters/one_euro.ts';
import { TargetArbitrator } from './targeting/arbitrator.ts';
import { DwellStateMachine } from './dwell/state_machine.ts';
import { resolveConfig } from './presets.ts';

export class InteractionEngineImpl implements InteractionEngine {
  private config: AssistanceConfig;
  private filter: IPointerFilter;
  private arbitrator: TargetArbitrator;
  private dwellFsm: DwellStateMachine;

  private lastGeometryRev: number = -1;
  private lastConfigRev: number = -1;
  private lastFilteredPoint: Point | null = null;
  private lastStepTimeMs: number = 0;

  constructor(config: AssistanceConfig) {
    this.config = resolveConfig(config);
    this.filter = this.createFilter(this.config);
    this.arbitrator = new TargetArbitrator();
    this.dwellFsm = new DwellStateMachine();
    this.lastConfigRev = this.config.revision;
  }

  private createFilter(config: AssistanceConfig): IPointerFilter {
    if (config.mode === 'raw_virtual' || config.mode === 'native') {
      return new PassthroughFilter();
    }
    if (config.filter.kind === 'one_euro') {
      return new OneEuroFilter(
        config.filter.min_cutoff_hz,
        config.filter.beta ?? 0.005,
        config.filter.derivative_cutoff_hz ?? 1.0
      );
    }
    return new ExponentialFilter(config.filter.min_cutoff_hz);
  }

  public step(input: EngineInput): EngineOutput {
    const { raw, targets, geometryRevision, configRevision } = input;

    // 1. Revision invalidation check
    if (
      (this.lastGeometryRev !== -1 && geometryRevision !== this.lastGeometryRev) ||
      (this.lastConfigRev !== -1 && configRevision !== this.lastConfigRev)
    ) {
      this.dwellFsm.cancel('revision_changed');
      this.arbitrator.reset();
    }
    this.lastGeometryRev = geometryRevision;
    this.lastConfigRev = configRevision;

    // 2. Filter pointer coordinates
    const filteredPointer = this.filter.filter(raw);

    // 3. Estimate instantaneous speed for escape detection (px/s)
    let speedPxPerSec = 0;
    if (this.lastFilteredPoint !== null && raw.tMs > this.lastStepTimeMs) {
      const dtSec = (raw.tMs - this.lastStepTimeMs) / 1000.0;
      if (dtSec > 0 && dtSec < 0.5) {
        const dx = filteredPointer.x - this.lastFilteredPoint.x;
        const dy = filteredPointer.y - this.lastFilteredPoint.y;
        speedPxPerSec = Math.sqrt(dx * dx + dy * dy) / dtSec;
      }
    }
    this.lastFilteredPoint = filteredPointer;
    this.lastStepTimeMs = raw.tMs;

    // 4. Target arbitration
    const decision = this.arbitrator.arbitrate(
      filteredPointer,
      targets,
      this.config.target,
      speedPxPerSec
    );

    // 5. Check active target dwell eligibility
    let dwellAllowed = false;
    if (decision.candidateId !== null) {
      const candidateTarget = targets.find((t) => t.id === decision.candidateId);
      dwellAllowed = candidateTarget ? candidateTarget.dwellAllowed && candidateTarget.enabled : false;
    }

    // 6. Step dwell state machine
    const dwellResult = this.dwellFsm.step(
      decision.candidateId,
      dwellAllowed,
      raw.tMs,
      this.config.dwell
    );

    return {
      pointer: filteredPointer,
      candidateId: decision.candidateId,
      ambiguous: decision.ambiguous,
      dwellProgress: dwellResult.progress,
      selection: dwellResult.selection,
    };
  }

  public cancel(reason: string): void {
    this.dwellFsm.cancel(reason);
    this.arbitrator.reset();
  }

  public reset(point: Point): void {
    this.filter.reset(point);
    this.dwellFsm.reset();
    this.arbitrator.reset();
    this.lastFilteredPoint = point;
    this.lastStepTimeMs = point.tMs;
  }

  public applyConfig(config: AssistanceConfig): void {
    this.config = resolveConfig(config);
    this.filter = this.createFilter(this.config);
    this.dwellFsm.cancel('config_applied');
    this.arbitrator.reset();
    this.lastConfigRev = this.config.revision;
  }

  public getConfig(): AssistanceConfig {
    return this.config;
  }
}

export function createInteractionEngine(config: AssistanceConfig): InteractionEngine {
  return new InteractionEngineImpl(config);
}
