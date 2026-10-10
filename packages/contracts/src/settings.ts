/**
 * Settings and assistance configuration contracts.
 * Conforms to docs/contracts.md (Version 1).
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

export const PRESETS: Record<'light' | 'steady', Omit<AssistanceConfig, 'v' | 'revision'>> = {
  light: {
    mode: 'stabilized',
    filter: {
      kind: 'one_euro',
      min_cutoff_hz: 1.5,
      beta: 0.001,
      derivative_cutoff_hz: 1.0,
    },
    target: {
      capture_radius_px: 12,
      ambiguity_margin_px: 6,
    },
    dwell: {
      enabled: true,
      duration_ms: 700,
      rearm_ms: 250,
    },
    haptics_enabled: false,
    show_raw_pointer: false,
  },
  steady: {
    mode: 'stabilized',
    filter: {
      kind: 'one_euro',
      min_cutoff_hz: 0.8,
      beta: 0.005,
      derivative_cutoff_hz: 1.0,
    },
    target: {
      capture_radius_px: 18,
      ambiguity_margin_px: 8,
    },
    dwell: {
      enabled: true,
      duration_ms: 900,
      rearm_ms: 350,
    },
    haptics_enabled: false,
    show_raw_pointer: false,
  },
};
