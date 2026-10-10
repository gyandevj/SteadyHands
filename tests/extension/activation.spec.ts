import test from 'node:test';
import assert from 'node:assert';
import { LocalInteractionEngine } from '../../apps/extension/src/content/engineStub.ts';
import { Target, Point, EngineInput } from '../../apps/extension/src/types/index.ts';

test('Activation: at-most-once dwell selection invariant', () => {
  const engine = new LocalInteractionEngine();
  const testTarget: Target = {
    id: 'target-input-1',
    rect: { x: 100, y: 100, width: 120, height: 36 },
    kind: 'focus',
    enabled: true,
    dwellAllowed: true
  };

  const rawPoint: Point = { x: 110, y: 110, tMs: 1000 };
  const input: EngineInput = {
    raw: rawPoint,
    targets: [testTarget],
    geometryRevision: 1,
    configRevision: 1
  };

  // Step 1: initial hover (t = 1000ms)
  let out = engine.step(input);
  assert.strictEqual(out.candidateId, 'target-input-1');
  assert.strictEqual(out.dwellProgress, 0);
  assert.strictEqual(out.selection, null);

  // Step 2: intermediate hover (t = 1400ms, elapsed 400ms out of 800ms)
  input.raw = { x: 110, y: 110, tMs: 1400 };
  out = engine.step(input);
  assert.strictEqual(out.candidateId, 'target-input-1');
  assert.ok(out.dwellProgress >= 0.45 && out.dwellProgress <= 0.55);
  assert.strictEqual(out.selection, null);

  // Step 3: dwell completed (t = 1850ms, elapsed 850ms >= 800ms)
  input.raw = { x: 110, y: 110, tMs: 1850 };
  out = engine.step(input);
  assert.strictEqual(out.candidateId, 'target-input-1');
  assert.strictEqual(out.dwellProgress, 1.0);
  assert.notStrictEqual(out.selection, null);
  assert.strictEqual(out.selection?.targetId, 'target-input-1');
  const firstSelectionId = out.selection?.id;

  // Step 4: still hovering (t = 2200ms) -> MUST NOT trigger a second selection
  input.raw = { x: 110, y: 110, tMs: 2200 };
  out = engine.step(input);
  assert.strictEqual(out.selection, null, 'At-most-once violation: selection dispatched again while still hovering');
  assert.strictEqual(out.dwellProgress, 1.0);

  // Step 5: move away outside capture radius (capture radius = 16px, rect right edge is 220, so x = 300 is outside)
  input.raw = { x: 300, y: 300, tMs: 2400 };
  out = engine.step(input);
  assert.strictEqual(out.candidateId, null);
  assert.strictEqual(out.dwellProgress, 0);
  assert.strictEqual(out.selection, null);

  // Step 6: re-enter target (t = 2600ms) -> rearmed and starts new dwell
  input.raw = { x: 110, y: 110, tMs: 2600 };
  out = engine.step(input);
  assert.strictEqual(out.candidateId, 'target-input-1');
  assert.strictEqual(out.dwellProgress, 0);
  assert.strictEqual(out.selection, null);

  // Step 7: complete second dwell (t = 3450ms)
  input.raw = { x: 110, y: 110, tMs: 3450 };
  out = engine.step(input);
  assert.notStrictEqual(out.selection, null);
  assert.notStrictEqual(out.selection?.id, firstSelectionId);
});

test('Activation: cancellation when target has dwellAllowed=false', () => {
  const engine = new LocalInteractionEngine();
  const submitButton: Target = {
    id: 'submit-btn',
    rect: { x: 100, y: 200, width: 80, height: 32 },
    kind: 'button',
    enabled: true,
    dwellAllowed: false // Submit buttons must not dwell-activate
  };

  const input: EngineInput = {
    raw: { x: 120, y: 210, tMs: 1000 },
    targets: [submitButton],
    geometryRevision: 1,
    configRevision: 1
  };

  let out = engine.step(input);
  assert.strictEqual(out.candidateId, 'submit-btn');
  assert.strictEqual(out.dwellProgress, 0);

  // Hover for long time (t = 5000ms)
  input.raw = { x: 120, y: 210, tMs: 5000 };
  out = engine.step(input);
  assert.strictEqual(out.selection, null, 'Submit button must not be activated by dwell');
  assert.strictEqual(out.dwellProgress, 0);
});

test('Activation: cancellation on Escape or explicit cancel call', () => {
  const engine = new LocalInteractionEngine();
  const target: Target = {
    id: 'text-input',
    rect: { x: 50, y: 50, width: 100, height: 30 },
    kind: 'focus',
    enabled: true,
    dwellAllowed: true
  };

  const input: EngineInput = {
    raw: { x: 60, y: 60, tMs: 1000 },
    targets: [target],
    geometryRevision: 1,
    configRevision: 1
  };

  // Halfway through dwell (elapsed 500ms)
  engine.step(input);
  input.raw = { x: 60, y: 60, tMs: 1500 };
  let out = engine.step(input);
  assert.ok(out.dwellProgress > 0.5);

  // User presses Escape
  engine.cancel('escape_pressed');

  // Next step at t = 1600ms
  input.raw = { x: 60, y: 60, tMs: 1600 };
  out = engine.step(input);
  assert.strictEqual(out.dwellProgress, 0, 'Dwell progress must reset on cancellation');
  assert.strictEqual(out.selection, null);
});
