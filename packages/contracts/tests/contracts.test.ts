import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  parseAssistanceConfig,
  parseDeviceHello,
  parseSensorBatch,
  parseMotionFrame,
  parseHapticRequest,
  ContractError,
} from '../src/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const examplesDir = join(__dirname, '..', 'examples');

function loadJson(filename: string): unknown {
  return JSON.parse(readFileSync(join(examplesDir, filename), 'utf-8'));
}

describe('Contracts Schema Validation', () => {
  it('parses canonical settings.json successfully', () => {
    const data = loadJson('settings.json');
    const config = parseAssistanceConfig(data);
    assert.equal(config.v, 1);
    assert.equal(config.revision, 1);
    assert.equal(config.mode, 'stabilized');
    assert.equal(config.filter.kind, 'one_euro');
    assert.equal(config.filter.min_cutoff_hz, 1.0);
    assert.equal(config.target.capture_radius_px, 16);
    assert.equal(config.dwell.duration_ms, 800);
    assert.equal(config.haptics_enabled, false);
  });

  it('parses canonical device-hello.json successfully', () => {
    const data = loadJson('device-hello.json');
    const hello = parseDeviceHello(data);
    assert.equal(hello.v, 1);
    assert.equal(hello.type, 'device.hello');
    assert.equal(hello.source, 'synthetic');
    assert.equal(hello.boot_id, 'fixture-boot-1');
    assert.equal(hello.sensor.model, 'LIS3DHTR');
    assert.equal(hello.sensor.odr_hz, 100.0);
    assert.equal(hello.capabilities.haptics, false);
  });

  it('parses canonical sensor-batch.json successfully', () => {
    const data = loadJson('sensor-batch.json');
    const batch = parseSensorBatch(data);
    assert.equal(batch.v, 1);
    assert.equal(batch.type, 'sensor.batch');
    assert.equal(batch.batch_seq, 12);
    assert.equal(batch.samples.length, 2);
    assert.equal(batch.samples[0].seq, 120);
    assert.equal(batch.samples[0].a_g[2], 0.998);
    assert.equal(batch.counters.i2c_errors, 0);
  });

  it('parses canonical motion-frame.json successfully', () => {
    const data = loadJson('motion-frame.json');
    const frame = parseMotionFrame(data);
    assert.equal(frame.v, 1);
    assert.equal(frame.type, 'motion.frame');
    assert.equal(frame.source, 'synthetic');
    assert.equal(frame.quality.state, 'good');
    assert.equal(frame.motion.status, 'periodic_motion');
    assert.equal(frame.motion.dominant_hz, 5.0);
    assert.ok(frame.recommendation);
    assert.equal(frame.recommendation.preset, 'steady');
  });

  it('rejects invalid-frame.json with ContractError', () => {
    const data = loadJson('invalid-frame.json');
    assert.throws(() => {
      parseMotionFrame(data);
    }, (err: unknown) => {
      assert.ok(err instanceof ContractError);
      return true;
    });
  });

  it('parses canonical haptic-request.json successfully', () => {
    const data = loadJson('haptic-request.json');
    const haptic = parseHapticRequest(data);
    assert.equal(haptic.v, 1);
    assert.equal(haptic.type, 'haptic.request');
    assert.equal(haptic.duration_ms, 40);
    assert.equal(haptic.command_id, 'session-17-selection-4');
  });

  it('rejects haptic requests exceeding duration bounds (>80ms)', () => {
    assert.throws(() => {
      parseHapticRequest({
        v: 1,
        type: 'haptic.request',
        command_id: 'cmd-1',
        duration_ms: 120,
        reason: 'test',
      });
    }, ContractError);
  });

  it('rejects batch with more than 50 samples', () => {
    const samples = Array.from({ length: 51 }, (_, i) => ({
      seq: i,
      t_us: i * 10000,
      a_g: [0, 0, 1],
      valid: true,
      saturated: false,
      haptic_active: false,
    }));
    assert.throws(() => {
      parseSensorBatch({
        v: 1,
        type: 'sensor.batch',
        source: 'synthetic',
        boot_id: 'boot',
        stream_id: 'stream',
        batch_seq: 1,
        samples,
        counters: { i2c_errors: 0, dropped_samples: 0, queue_overflows: 0 },
      });
    }, ContractError);
  });
});
