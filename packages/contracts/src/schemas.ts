/**
 * Strict runtime validation and parsing for all canonical SteadyHand contracts.
 * Pure TypeScript; zero external library dependencies.
 */

import type { AssistanceConfig, FilterConfig, TargetConfig, DwellConfig } from './settings.ts';
import type { DeviceHello, SensorBatch, SensorSample, MotionFrame, HapticRequest, DataSource, QualityState, MotionStatus } from './device.ts';

export class ContractError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(field ? `ContractError [${field}]: ${message}` : `ContractError: ${message}`);
    this.name = 'ContractError';
    this.field = field;
  }
}

function assertObject(val: unknown, field: string): Record<string, unknown> {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) {
    throw new ContractError(`Expected object, got ${val === null ? 'null' : typeof val}`, field);
  }
  return val as Record<string, unknown>;
}

function assertNumber(val: unknown, field: string, min?: number, max?: number): number {
  if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
    throw new ContractError(`Expected finite number, got ${val}`, field);
  }
  if (min !== undefined && val < min) {
    throw new ContractError(`Value ${val} is below minimum ${min}`, field);
  }
  if (max !== undefined && val > max) {
    throw new ContractError(`Value ${val} is above maximum ${max}`, field);
  }
  return val;
}

function assertInteger(val: unknown, field: string, min?: number, max?: number): number {
  const num = assertNumber(val, field, min, max);
  if (!Number.isInteger(num)) {
    throw new ContractError(`Expected integer, got ${num}`, field);
  }
  return num;
}

function assertString(val: unknown, field: string, minLen = 1): string {
  if (typeof val !== 'string') {
    throw new ContractError(`Expected string, got ${typeof val}`, field);
  }
  if (val.length < minLen) {
    throw new ContractError(`String is empty or too short`, field);
  }
  return val;
}

function assertBoolean(val: unknown, field: string): boolean {
  if (typeof val !== 'boolean') {
    throw new ContractError(`Expected boolean, got ${typeof val}`, field);
  }
  return val;
}

const VALID_SOURCES: Set<string> = new Set(['live', 'recorded', 'synthetic', 'unavailable']);
const VALID_QUALITIES: Set<string> = new Set(['warming_up', 'good', 'degraded', 'stale', 'haptic_blanking', 'unavailable']);
const VALID_MOTIONS: Set<string> = new Set(['quiet', 'periodic_motion', 'other_motion', 'unknown']);

export function parseAssistanceConfig(data: unknown): AssistanceConfig {
  const obj = assertObject(data, 'config');
  if (obj.v !== 1) {
    throw new ContractError(`Unsupported schema version: ${obj.v}`, 'config.v');
  }

  const revision = assertInteger(obj.revision, 'config.revision', 0);
  const mode = assertString(obj.mode, 'config.mode');
  if (mode !== 'native' && mode !== 'stabilized' && mode !== 'raw_virtual') {
    throw new ContractError(`Invalid mode: ${mode}`, 'config.mode');
  }

  const filterObj = assertObject(obj.filter, 'config.filter');
  const kind = assertString(filterObj.kind, 'config.filter.kind');
  if (kind !== 'exponential' && kind !== 'one_euro') {
    throw new ContractError(`Invalid filter kind: ${kind}`, 'config.filter.kind');
  }
  const minCutoff = assertNumber(filterObj.min_cutoff_hz, 'config.filter.min_cutoff_hz', 0.1, 20.0);
  const filter: FilterConfig = {
    kind,
    min_cutoff_hz: minCutoff,
    beta: filterObj.beta !== undefined ? assertNumber(filterObj.beta, 'config.filter.beta', 0.0, 1.0) : undefined,
    derivative_cutoff_hz: filterObj.derivative_cutoff_hz !== undefined
      ? assertNumber(filterObj.derivative_cutoff_hz, 'config.filter.derivative_cutoff_hz', 0.1, 20.0)
      : undefined,
  };

  const targetObj = assertObject(obj.target, 'config.target');
  const target: TargetConfig = {
    capture_radius_px: assertNumber(targetObj.capture_radius_px, 'config.target.capture_radius_px', 0, 48),
    ambiguity_margin_px: assertNumber(targetObj.ambiguity_margin_px, 'config.target.ambiguity_margin_px', 0, 24),
  };

  const dwellObj = assertObject(obj.dwell, 'config.dwell');
  const dwell: DwellConfig = {
    enabled: assertBoolean(dwellObj.enabled, 'config.dwell.enabled'),
    duration_ms: assertNumber(dwellObj.duration_ms, 'config.dwell.duration_ms', 100, 3000),
    rearm_ms: assertNumber(dwellObj.rearm_ms, 'config.dwell.rearm_ms', 50, 2000),
  };

  return {
    v: 1,
    revision,
    mode,
    filter,
    target,
    dwell,
    haptics_enabled: assertBoolean(obj.haptics_enabled, 'config.haptics_enabled'),
    show_raw_pointer: assertBoolean(obj.show_raw_pointer, 'config.show_raw_pointer'),
  };
}

export function parseDeviceHello(data: unknown): DeviceHello {
  const obj = assertObject(data, 'device.hello');
  if (obj.v !== 1) throw new ContractError(`Unsupported version: ${obj.v}`, 'device.hello.v');
  if (obj.type !== 'device.hello') throw new ContractError(`Expected type device.hello, got ${obj.type}`, 'device.hello.type');

  const source = assertString(obj.source, 'device.hello.source') as DataSource;
  if (!VALID_SOURCES.has(source)) throw new ContractError(`Invalid source: ${source}`, 'device.hello.source');

  const bootId = assertString(obj.boot_id, 'device.hello.boot_id');
  const streamId = assertString(obj.stream_id, 'device.hello.stream_id');

  const sensorObj = assertObject(obj.sensor, 'device.hello.sensor');
  const sensor = {
    model: assertString(sensorObj.model, 'device.hello.sensor.model'),
    bus: assertString(sensorObj.bus, 'device.hello.sensor.bus'),
    address_hex: assertString(sensorObj.address_hex, 'device.hello.sensor.address_hex'),
    odr_hz: assertNumber(sensorObj.odr_hz, 'device.hello.sensor.odr_hz', 1.0, 1000.0),
    range_g: assertNumber(sensorObj.range_g, 'device.hello.sensor.range_g', 0.5, 32.0),
    units: assertString(sensorObj.units, 'device.hello.sensor.units'),
    resolution_bits: sensorObj.resolution_bits !== undefined ? assertInteger(sensorObj.resolution_bits, 'device.hello.sensor.resolution_bits', 6, 24) : undefined,
    haptics: sensorObj.haptics !== undefined ? assertBoolean(sensorObj.haptics, 'device.hello.sensor.haptics') : undefined,
  };

  const capObj = assertObject(obj.capabilities, 'device.hello.capabilities');
  const capabilities = {
    haptics: assertBoolean(capObj.haptics, 'device.hello.capabilities.haptics'),
  };

  return {
    v: 1,
    type: 'device.hello',
    source,
    boot_id: bootId,
    stream_id: streamId,
    sensor,
    capabilities,
  };
}

export function parseSensorSample(data: unknown, idx: number): SensorSample {
  const obj = assertObject(data, `sample[${idx}]`);
  const seq = assertInteger(obj.seq, `sample[${idx}].seq`, 0);
  const tUs = assertInteger(obj.t_us, `sample[${idx}].t_us`, 0);

  if (!Array.isArray(obj.a_g) || obj.a_g.length !== 3) {
    throw new ContractError(`Expected 3-element tuple for a_g`, `sample[${idx}].a_g`);
  }
  const ax = assertNumber(obj.a_g[0], `sample[${idx}].a_g[0]`);
  const ay = assertNumber(obj.a_g[1], `sample[${idx}].a_g[1]`);
  const az = assertNumber(obj.a_g[2], `sample[${idx}].a_g[2]`);

  return {
    seq,
    t_us: tUs,
    a_g: [ax, ay, az],
    valid: assertBoolean(obj.valid, `sample[${idx}].valid`),
    saturated: assertBoolean(obj.saturated, `sample[${idx}].saturated`),
    haptic_active: assertBoolean(obj.haptic_active, `sample[${idx}].haptic_active`),
  };
}

export function parseSensorBatch(data: unknown): SensorBatch {
  const obj = assertObject(data, 'sensor.batch');
  if (obj.v !== 1) throw new ContractError(`Unsupported version: ${obj.v}`, 'sensor.batch.v');
  if (obj.type !== 'sensor.batch') throw new ContractError(`Expected type sensor.batch`, 'sensor.batch.type');

  const source = assertString(obj.source, 'sensor.batch.source') as DataSource;
  if (!VALID_SOURCES.has(source)) throw new ContractError(`Invalid source: ${source}`, 'sensor.batch.source');

  const bootId = assertString(obj.boot_id, 'sensor.batch.boot_id');
  const streamId = assertString(obj.stream_id, 'sensor.batch.stream_id');
  const batchSeq = assertInteger(obj.batch_seq, 'sensor.batch.batch_seq', 0);

  if (!Array.isArray(obj.samples)) {
    throw new ContractError(`Expected array of samples`, 'sensor.batch.samples');
  }
  if (obj.samples.length > 50) {
    throw new ContractError(`Batch size ${obj.samples.length} exceeds max 50`, 'sensor.batch.samples');
  }

  const samples = obj.samples.map((s, i) => parseSensorSample(s, i));

  const countersObj = assertObject(obj.counters, 'sensor.batch.counters');
  const counters = {
    i2c_errors: assertInteger(countersObj.i2c_errors, 'sensor.batch.counters.i2c_errors', 0),
    dropped_samples: assertInteger(countersObj.dropped_samples, 'sensor.batch.counters.dropped_samples', 0),
    queue_overflows: assertInteger(countersObj.queue_overflows, 'sensor.batch.counters.queue_overflows', 0),
  };

  return {
    v: 1,
    type: 'sensor.batch',
    source,
    boot_id: bootId,
    stream_id: streamId,
    batch_seq: batchSeq,
    samples,
    counters,
  };
}

export function parseMotionFrame(data: unknown): MotionFrame {
  const obj = assertObject(data, 'motion.frame');
  if (obj.v !== 1) throw new ContractError(`Unsupported version: ${obj.v}`, 'motion.frame.v');
  if (obj.type !== 'motion.frame') throw new ContractError(`Expected type motion.frame`, 'motion.frame.type');

  const source = assertString(obj.source, 'motion.frame.source') as DataSource;
  if (!VALID_SOURCES.has(source)) throw new ContractError(`Invalid source: ${source}`, 'motion.frame.source');

  const bootId = assertString(obj.boot_id, 'motion.frame.boot_id');
  const streamId = assertString(obj.stream_id, 'motion.frame.stream_id');
  const frameSeq = assertInteger(obj.frame_seq, 'motion.frame.frame_seq', 0);

  const windowObj = assertObject(obj.window, 'motion.frame.window');
  const window = {
    start_us: assertInteger(windowObj.start_us, 'motion.frame.window.start_us', 0),
    end_us: assertInteger(windowObj.end_us, 'motion.frame.window.end_us', 0),
    fresh_samples: assertInteger(windowObj.fresh_samples, 'motion.frame.window.fresh_samples', 0),
  };
  if (window.end_us < window.start_us) {
    throw new ContractError(`end_us must be >= start_us`, 'motion.frame.window');
  }

  const qualityObj = assertObject(obj.quality, 'motion.frame.quality');
  const qState = assertString(qualityObj.state, 'motion.frame.quality.state') as QualityState;
  if (!VALID_QUALITIES.has(qState)) throw new ContractError(`Invalid quality state: ${qState}`, 'motion.frame.quality.state');
  if (!Array.isArray(qualityObj.reasons)) throw new ContractError(`Expected reasons array`, 'motion.frame.quality.reasons');

  const quality = {
    state: qState,
    reasons: qualityObj.reasons.map((r, i) => assertString(r, `quality.reasons[${i}]`)),
    measured_hz: assertNumber(qualityObj.measured_hz, 'motion.frame.quality.measured_hz', 0.0),
    missing_fraction: assertNumber(qualityObj.missing_fraction, 'motion.frame.quality.missing_fraction', 0.0, 1.0),
    max_gap_ms: assertNumber(qualityObj.max_gap_ms, 'motion.frame.quality.max_gap_ms', 0.0),
  };

  const motionObj = assertObject(obj.motion, 'motion.frame.motion');
  const mStatus = assertString(motionObj.status, 'motion.frame.motion.status') as MotionStatus;
  if (!VALID_MOTIONS.has(mStatus)) throw new ContractError(`Invalid motion status: ${mStatus}`, 'motion.frame.motion.status');

  const motion = {
    status: mStatus,
    dominant_hz: motionObj.dominant_hz === null ? null : assertNumber(motionObj.dominant_hz, 'motion.frame.motion.dominant_hz', 0.0, 50.0),
    band_rms_g: motionObj.band_rms_g === null ? null : assertNumber(motionObj.band_rms_g, 'motion.frame.motion.band_rms_g', 0.0),
    band_power_ratio: motionObj.band_power_ratio === null ? null : assertNumber(motionObj.band_power_ratio, 'motion.frame.motion.band_power_ratio', 0.0, 1.0),
    peak_concentration: motionObj.peak_concentration === null ? null : assertNumber(motionObj.peak_concentration, 'motion.frame.motion.peak_concentration', 0.0, 1.0),
  };

  let recommendation = null;
  if (obj.recommendation !== null && obj.recommendation !== undefined) {
    const recObj = assertObject(obj.recommendation, 'motion.frame.recommendation');
    const preset = assertString(recObj.preset, 'motion.frame.recommendation.preset');
    if (preset !== 'light' && preset !== 'steady') {
      throw new ContractError(`Invalid preset: ${preset}`, 'motion.frame.recommendation.preset');
    }
    recommendation = {
      id: assertString(recObj.id, 'motion.frame.recommendation.id'),
      preset: preset as 'light' | 'steady',
      requires_user_acceptance: assertBoolean(recObj.requires_user_acceptance, 'motion.frame.recommendation.requires_user_acceptance'),
      reason_code: assertString(recObj.reason_code, 'motion.frame.recommendation.reason_code'),
    };
  }

  return {
    v: 1,
    type: 'motion.frame',
    source,
    boot_id: bootId,
    stream_id: streamId,
    frame_seq: frameSeq,
    window,
    quality,
    motion,
    recommendation,
  };
}

export function parseHapticRequest(data: unknown): HapticRequest {
  const obj = assertObject(data, 'haptic.request');
  if (obj.v !== 1) throw new ContractError(`Unsupported version: ${obj.v}`, 'haptic.request.v');
  if (obj.type !== 'haptic.request') throw new ContractError(`Expected type haptic.request`, 'haptic.request.type');

  return {
    v: 1,
    type: 'haptic.request',
    command_id: assertString(obj.command_id, 'haptic.request.command_id'),
    duration_ms: assertInteger(obj.duration_ms, 'haptic.request.duration_ms', 1, 80),
    reason: assertString(obj.reason, 'haptic.request.reason'),
  };
}
