/**
 * Canonical domain models for the SteadyHand pure pointer interaction engine.
 * Conforms to docs/contracts.md (Version 1).
 * Zero dependencies on DOM, Chrome, or backend libraries.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
  readonly tMs: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type TargetKind = 'focus' | 'toggle' | 'button';

export interface Target {
  readonly id: string;
  readonly rect: Rect;
  readonly kind: TargetKind;
  readonly enabled: boolean;
  readonly dwellAllowed: boolean;
}

export type PointerMode = 'native' | 'stabilized' | 'raw_virtual';
export type FilterKind = 'exponential' | 'one_euro';

export interface FilterConfig {
  readonly kind: FilterKind;
  readonly min_cutoff_hz: number;
  readonly beta?: number;
  readonly derivative_cutoff_hz?: number;
}

export interface TargetConfig {
  readonly capture_radius_px: number;
  readonly ambiguity_margin_px: number;
}

export interface DwellConfig {
  readonly enabled: boolean;
  readonly duration_ms: number;
  readonly rearm_ms: number;
}

export interface AssistanceConfig {
  readonly v: 1;
  readonly revision: number;
  readonly mode: PointerMode;
  readonly filter: FilterConfig;
  readonly target: TargetConfig;
  readonly dwell: DwellConfig;
  readonly haptics_enabled: boolean;
  readonly show_raw_pointer: boolean;
}

export interface EngineInput {
  readonly raw: Point;
  readonly targets: readonly Target[];
  readonly geometryRevision: number;
  readonly configRevision: number;
}

export interface SelectionEvent {
  readonly id: string;
  readonly targetId: string;
}

export interface EngineOutput {
  readonly pointer: Point;
  readonly candidateId: string | null;
  readonly ambiguous: boolean;
  readonly dwellProgress: number;
  readonly selection: SelectionEvent | null;
}

export interface InteractionEngine {
  step(input: EngineInput): EngineOutput;
  cancel(reason: string): void;
  reset(point: Point): void;
  applyConfig(config: AssistanceConfig): void;
  getConfig(): AssistanceConfig;
}
