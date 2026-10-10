import test from 'node:test';
import assert from 'node:assert';
import { distanceToRect } from '../../packages/engine/src/targeting/distance.ts';
import { TargetArbitrator } from '../../packages/engine/src/targeting/arbitrator.ts';
import type { Target, TargetConfig } from '../../packages/engine/src/types.ts';

const config: TargetConfig = {
  capture_radius_px: 16,
  ambiguity_margin_px: 8,
};

test('distanceToRect - interior, edges, and corners', () => {
  const rect = { x: 100, y: 100, width: 50, height: 50 };

  // Inside
  assert.strictEqual(distanceToRect({ x: 125, y: 125, tMs: 0 }, rect), 0.0);
  // Edge (left by 10px)
  assert.strictEqual(distanceToRect({ x: 90, y: 125, tMs: 0 }, rect), 10.0);
  // Corner (top-left by dx=3, dy=4 -> dist=5)
  assert.strictEqual(distanceToRect({ x: 97, y: 96, tMs: 0 }, rect), 5.0);
});

test('TargetArbitrator - selects unique candidate inside capture radius', () => {
  const arbitrator = new TargetArbitrator();
  const target: Target = {
    id: 'btn-1',
    rect: { x: 100, y: 100, width: 48, height: 48 },
    kind: 'button',
    enabled: true,
    dwellAllowed: false,
  };

  // 10px outside boundary (within 16px capture radius)
  const decision = arbitrator.arbitrate({ x: 90, y: 120, tMs: 0 }, [target], config);
  assert.strictEqual(decision.candidateId, 'btn-1');
  assert.strictEqual(decision.ambiguous, false);
});

test('TargetArbitrator - ignores target outside capture radius', () => {
  const arbitrator = new TargetArbitrator();
  const target: Target = {
    id: 'btn-1',
    rect: { x: 100, y: 100, width: 48, height: 48 },
    kind: 'button',
    enabled: true,
    dwellAllowed: false,
  };

  // 25px outside boundary (exceeds 16px radius)
  const decision = arbitrator.arbitrate({ x: 75, y: 120, tMs: 0 }, [target], config);
  assert.strictEqual(decision.candidateId, null);
  assert.strictEqual(decision.ambiguous, false);
});

test('TargetArbitrator - ambiguity rejection on equidistant competing targets', () => {
  const arbitrator = new TargetArbitrator();
  const t1: Target = {
    id: 'radio-1',
    rect: { x: 100, y: 100, width: 24, height: 24 },
    kind: 'toggle',
    enabled: true,
    dwellAllowed: true,
  };
  const t2: Target = {
    id: 'radio-2',
    rect: { x: 100, y: 130, width: 24, height: 24 },
    kind: 'toggle',
    enabled: true,
    dwellAllowed: true,
  };

  // Pointer placed exactly 3px from t1 and 3px from t2 (|d1 - d2| = 0 < ambiguity_margin 8px)
  const decision = arbitrator.arbitrate({ x: 110, y: 127, tMs: 0 }, [t1, t2], config);
  assert.strictEqual(decision.candidateId, null);
  assert.strictEqual(decision.ambiguous, true);
});

test('TargetArbitrator - hysteresis retains active candidate past normal radius', () => {
  const arbitrator = new TargetArbitrator();
  const target: Target = {
    id: 'chk-1',
    rect: { x: 100, y: 100, width: 24, height: 24 },
    kind: 'toggle',
    enabled: true,
    dwellAllowed: true,
  };

  // Step 1: acquire candidate inside 16px radius (at 10px distance)
  arbitrator.arbitrate({ x: 90, y: 110, tMs: 0 }, [target], config);
  assert.strictEqual(arbitrator.getActiveCandidateId(), 'chk-1');

  // Step 2: move to 19px distance (outside 16px capture radius, but inside 16 + 6 = 22px exit boundary)
  const step2 = arbitrator.arbitrate({ x: 81, y: 110, tMs: 16 }, [target], config, 50);
  assert.strictEqual(step2.candidateId, 'chk-1');

  // Step 3: move to 25px distance (outside 22px exit boundary) -> candidate dropped
  const step3 = arbitrator.arbitrate({ x: 75, y: 110, tMs: 32 }, [target], config, 50);
  assert.strictEqual(step3.candidateId, null);
});

test('TargetArbitrator - deliberate escape drops hysteresis', () => {
  const arbitrator = new TargetArbitrator();
  const target: Target = {
    id: 'chk-1',
    rect: { x: 100, y: 100, width: 24, height: 24 },
    kind: 'toggle',
    enabled: true,
    dwellAllowed: true,
  };

  // Acquire candidate
  arbitrator.arbitrate({ x: 90, y: 110, tMs: 0 }, [target], config);

  // Rapid movement (>600 px/s) at 19px distance drops hysteresis to 0
  const step2 = arbitrator.arbitrate({ x: 81, y: 110, tMs: 16 }, [target], config, 800);
  assert.strictEqual(step2.candidateId, null);
});
