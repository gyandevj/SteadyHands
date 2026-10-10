import type { AssistanceConfig } from './types.ts';

export const PRESETS: Record<'light' | 'steady', AssistanceConfig> = {
  light: {
    v: 1,
    revision: 1,
    mode: 'stabilized',
    filter: {
      kind: 'exponential',
      min_cutoff_hz: 2.5,
      beta: 0.005,
      derivative_cutoff_hz: 1.0,
    },
    target: {
      capture_radius_px: 12,
      ambiguity_margin_px: 8,
    },
    dwell: {
      enabled: true,
      duration_ms: 600,
      rearm_ms: 250,
    },
    haptics_enabled: false,
    show_raw_pointer: false,
  },
  steady: {
    v: 1,
    revision: 1,
    mode: 'stabilized',
    filter: {
      kind: 'exponential',
      min_cutoff_hz: 1.0,
      beta: 0.001,
      derivative_cutoff_hz: 1.0,
    },
    target: {
      capture_radius_px: 18,
      ambiguity_margin_px: 8,
    },
    dwell: {
      enabled: true,
      duration_ms: 1000,
      rearm_ms: 400,
    },
    haptics_enabled: false,
    show_raw_pointer: false,
  },
};

/**
 * Validates and clamps an incoming AssistanceConfig to safe engineering bounds.
 */
export function resolveConfig(
  base: AssistanceConfig,
  overrides?: Partial<AssistanceConfig>
): AssistanceConfig {
  const cfg = { ...base, ...overrides };

  const minCutoff = Math.max(0.1, Math.min(20.0, cfg.filter.min_cutoff_hz));
  const beta = Math.max(0.0, Math.min(1.0, cfg.filter.beta ?? 0.002));
  const derivCutoff = Math.max(0.1, Math.min(10.0, cfg.filter.derivative_cutoff_hz ?? 1.0));

  const captureRadius = Math.max(0, Math.min(24, Math.round(cfg.target.capture_radius_px)));
  const ambiguityMargin = Math.max(2, Math.min(24, Math.round(cfg.target.ambiguity_margin_px)));

  const dwellDuration = Math.max(400, Math.min(2000, Math.round(cfg.dwell.duration_ms)));
  const rearmDuration = Math.max(100, Math.min(1500, Math.round(cfg.dwell.rearm_ms)));

  return {
    v: 1,
    revision: cfg.revision ?? 1,
    mode: cfg.mode ?? 'stabilized',
    filter: {
      kind: cfg.filter.kind ?? 'exponential',
      min_cutoff_hz: minCutoff,
      beta,
      derivative_cutoff_hz: derivCutoff,
    },
    target: {
      capture_radius_px: captureRadius,
      ambiguity_margin_px: ambiguityMargin,
    },
    dwell: {
      enabled: Boolean(cfg.dwell.enabled),
      duration_ms: dwellDuration,
      rearm_ms: rearmDuration,
    },
    haptics_enabled: Boolean(cfg.haptics_enabled),
    show_raw_pointer: Boolean(cfg.show_raw_pointer),
  };
}
