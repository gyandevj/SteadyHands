/**
 * Device, sensor, frame, and hardware stream contracts.
 * Conforms strictly to docs/contracts.md (Version 1).
 */

export type DataSource = 'live' | 'recorded' | 'synthetic' | 'unavailable';

export type QualityState =
  | 'warming_up'
  | 'good'
  | 'degraded'
  | 'stale'
  | 'haptic_blanking'
  | 'unavailable';

export type MotionStatus =
  | 'quiet'
  | 'periodic_motion'
  | 'other_motion'
  | 'unknown';

export interface SensorCapability {
  readonly model: string;
  readonly bus: string;
  readonly address_hex: string;
  readonly odr_hz: number;
  readonly range_g: number;
  readonly units: string;
  readonly resolution_bits?: number;
  readonly haptics?: boolean;
}

export interface DeviceCapabilities {
  readonly haptics: boolean;
}

export interface DeviceHello {
  readonly v: 1;
  readonly type: 'device.hello';
  readonly source: DataSource;
  readonly boot_id: string;
  readonly stream_id: string;
  readonly sensor: SensorCapability;
  readonly capabilities: DeviceCapabilities;
}

export interface SensorSample {
  readonly seq: number;
  readonly t_us: number;
  readonly a_g: readonly [number, number, number];
  readonly valid: boolean;
  readonly saturated: boolean;
  readonly haptic_active: boolean;
}

export interface BatchCounters {
  readonly i2c_errors: number;
  readonly dropped_samples: number;
  readonly queue_overflows: number;
}

export interface SensorBatch {
  readonly v: 1;
  readonly type: 'sensor.batch';
  readonly source: DataSource;
  readonly boot_id: string;
  readonly stream_id: string;
  readonly batch_seq: number;
  readonly samples: readonly SensorSample[];
  readonly counters: BatchCounters;
}

export interface WindowQuality {
  readonly state: QualityState;
  readonly reasons: readonly string[];
  readonly measured_hz: number;
  readonly missing_fraction: number;
  readonly max_gap_ms: number;
}

export interface MotionFeatures {
  readonly status: MotionStatus;
  readonly dominant_hz: number | null;
  readonly band_rms_g: number | null;
  readonly band_power_ratio: number | null;
  readonly peak_concentration: number | null;
}

export interface AdvisoryRecommendation {
  readonly id: string;
  readonly preset: 'light' | 'steady';
  readonly requires_user_acceptance: boolean;
  readonly reason_code: string;
}

export interface WindowMetrics {
  readonly start_us: number;
  readonly end_us: number;
  readonly fresh_samples: number;
}

export interface MotionFrame {
  readonly v: 1;
  readonly type: 'motion.frame';
  readonly source: DataSource;
  readonly boot_id: string;
  readonly stream_id: string;
  readonly frame_seq: number;
  readonly window: WindowMetrics;
  readonly quality: WindowQuality;
  readonly motion: MotionFeatures;
  readonly recommendation: AdvisoryRecommendation | null;
}

export interface DeviceHealth {
  readonly v: 1;
  readonly type: 'device.health';
  readonly source: DataSource;
  readonly uptime_s: number;
  readonly sample_rate_hz: number;
  readonly total_samples: number;
  readonly dropped_samples: number;
  readonly queue_overflows: number;
  readonly is_stale: boolean;
  readonly last_sample_t_us: number | null;
}

export type CalibrationPhase = 'stationary' | 'intentional';
export type CalibrationStateKind = 'idle' | 'collecting' | 'complete' | 'rejected';

export interface CalibrationResult {
  readonly state: 'complete' | 'rejected';
  readonly reasons: readonly string[];
  readonly bias_g: readonly [number, number, number];
  readonly noise_std_g: number;
  readonly sample_count: number;
  readonly duration_ms: number;
}

export interface CalibrationState {
  readonly v: 1;
  readonly type: 'calibration.state';
  readonly session_id: string;
  readonly phase: CalibrationPhase;
  readonly state: CalibrationStateKind;
  readonly progress: number; // 0.0 to 1.0
  readonly quality: WindowQuality;
  readonly result: CalibrationResult | null;
}

export interface HapticRequest {
  readonly v: 1;
  readonly type: 'haptic.request';
  readonly command_id: string;
  readonly duration_ms: number;
  readonly reason: string;
}

export interface HapticAck {
  readonly v: 1;
  readonly type: 'haptic.ack';
  readonly command_id: string;
  readonly accepted: boolean;
  readonly reason?: string;
}

export interface HapticPulse {
  readonly v: 1;
  readonly type: 'haptic.pulse';
  readonly command_id: string;
  readonly mcu_start_us: number;
  readonly mcu_end_us: number;
}
