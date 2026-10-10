import test from 'node:test';
import assert from 'node:assert/strict';
import { OneEuroFilter } from '../../packages/engine/src/filters/one_euro.ts';
import { ExponentialFilter } from '../../packages/engine/src/filters/exponential.ts';
import { createInteractionEngine } from '../../packages/engine/src/engine.ts';
import type { AssistanceConfig, EngineInput } from '../../packages/engine/src/types.ts';

test('OneEuroFilter - initialization snaps to first point', () => {
  const filter = new OneEuroFilter(1.0, 0.005, 1.0);
  const pt = filter.filter({ x: 150, y: 250, tMs: 1000 });
  assert.equal(pt.x, 150);
  assert.equal(pt.y, 250);
  assert.equal(pt.tMs, 1000);
});

test('OneEuroFilter - stationary jitter suppression (high smoothing at low speed)', () => {
  // Test stationary signal with zero-velocity intent plus artificial noise
  const filter = new OneEuroFilter(1.0, 0.005, 1.0);
  const rawPoints = [];
  const filteredPoints = [];

  // Seeded deterministic noise
  for (let i = 0; i < 100; i++) {
    const tMs = 1000 + i * 16.67;
    // High frequency oscillation: alternating +- 5px
    const noise = Math.sin(i * 0.8) * 5.0;
    const raw = { x: 200 + noise, y: 200 - noise, tMs };
    rawPoints.push(raw);
    filteredPoints.push(filter.filter(raw));
  }

  // Calculate standard deviations (skipping initial settling samples 0-10)
  const rawTail = rawPoints.slice(10).map((p) => p.x);
  const filteredTail = filteredPoints.slice(10).map((p) => p.x);

  const calcStd = (arr: number[]) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  };

  const rawStd = calcStd(rawTail);
  const filteredStd = calcStd(filteredTail);

  // Filtered standard deviation should be significantly reduced (>60% reduction)
  assert.ok(
    filteredStd < rawStd * 0.4,
    `Expected filtered std (${filteredStd}) to be < 40% of raw std (${rawStd})`
  );
});

test('OneEuroFilter - speed-adaptive responsiveness reduces lag compared to static low-pass', () => {
  // Fast ballistic sweep from x = 0 to x = 1000 at 1000 px/s (1s duration, dt = 16.67ms)
  const oneEuro = new OneEuroFilter(1.0, 0.005, 1.0);
  const expFilter = new ExponentialFilter(1.0);

  let lastRawX = 0;
  let lastOneEuroX = 0;
  let lastExpX = 0;

  for (let i = 0; i <= 60; i++) {
    const tMs = 1000 + i * 16.67;
    const x = i * (1000 / 60);
    const raw = { x, y: 100, tMs };

    const pOneEuro = oneEuro.filter(raw);
    const pExp = expFilter.filter(raw);

    if (i === 60) {
      lastRawX = x;
      lastOneEuroX = pOneEuro.x;
      lastExpX = pExp.x;
    }
  }

  const oneEuroLag = lastRawX - lastOneEuroX;
  const expLag = lastRawX - lastExpX;

  // One Euro filter must adaptively increase cutoff during high speed, having significantly less lag than static 1Hz exponential
  assert.ok(
    oneEuroLag < expLag * 0.5,
    `One Euro lag (${oneEuroLag}px) should be less than half of static exponential lag (${expLag}px)`
  );
});

test('OneEuroFilter - duplicate timestamp handling (dt <= 0)', () => {
  const filter = new OneEuroFilter();
  filter.filter({ x: 10, y: 20, tMs: 100 });
  const p2 = filter.filter({ x: 50, y: 60, tMs: 100 });

  // When dt <= 0, retain previous position
  assert.equal(p2.x, 10);
  assert.equal(p2.y, 20);
  assert.equal(p2.tMs, 100);
});

test('OneEuroFilter - long pause recovery (dt > 1000ms snaps position)', () => {
  const filter = new OneEuroFilter();
  filter.filter({ x: 10, y: 20, tMs: 100 });
  // Sudden sample after 2 seconds
  const p = filter.filter({ x: 500, y: 600, tMs: 2200 });

  assert.equal(p.x, 500);
  assert.equal(p.y, 600);
  assert.equal(p.tMs, 2200);
});

test('OneEuroFilter - nonfinite input rejection', () => {
  const filter = new OneEuroFilter();
  filter.filter({ x: 50, y: 80, tMs: 100 });
  const bad = filter.filter({ x: NaN, y: Infinity, tMs: 116 });

  assert.equal(bad.x, 50);
  assert.equal(bad.y, 80);
});

test('InteractionEngine - integrates OneEuroFilter when config specifies one_euro', () => {
  const config: AssistanceConfig = {
    v: 1,
    revision: 1,
    mode: 'stabilized',
    filter: {
      kind: 'one_euro',
      min_cutoff_hz: 1.0,
      beta: 0.005,
      derivative_cutoff_hz: 1.0,
    },
    target: { capture_radius_px: 16, ambiguity_margin_px: 8 },
    dwell: { enabled: true, duration_ms: 800, rearm_ms: 300 },
    haptics_enabled: false,
    show_raw_pointer: false,
  };

  const engine = createInteractionEngine(config);

  const input1: EngineInput = {
    raw: { x: 100, y: 100, tMs: 1000 },
    targets: [],
    geometryRevision: 1,
    configRevision: 1,
  };
  const out1 = engine.step(input1);
  assert.equal(out1.pointer.x, 100);
  assert.equal(out1.pointer.y, 100);

  const input2: EngineInput = {
    raw: { x: 150, y: 150, tMs: 1016.67 },
    targets: [],
    geometryRevision: 1,
    configRevision: 1,
  };
  const out2 = engine.step(input2);
  // Filtered pointer should move toward 150
  assert.ok(out2.pointer.x > 100 && out2.pointer.x < 150);
});
