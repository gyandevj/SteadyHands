import test from 'node:test';
import assert from 'node:assert';
import { LocalInteractionEngine } from '../../apps/extension/src/content/engineStub.ts';
import { Target, EngineInput } from '../../apps/extension/src/types/index.ts';

test('Geometry: candidate arbitration and ambiguity margin rejection', () => {
  const engine = new LocalInteractionEngine();

  // Two closely placed buttons
  const targetA: Target = {
    id: 'btn-a',
    rect: { x: 100, y: 100, width: 40, height: 30 },
    kind: 'focus',
    enabled: true,
    dwellAllowed: true
  };
  const targetB: Target = {
    id: 'btn-b',
    rect: { x: 145, y: 100, width: 40, height: 30 },
    kind: 'focus',
    enabled: true,
    dwellAllowed: true
  };

  // Cursor is at x = 142.5 (exactly between targetA right edge at 140 and targetB left edge at 145)
  // Distance to targetA: 2.5px. Distance to targetB: 2.5px.
  // Both are within capture radius (16px), distance diff is 0px < ambiguity margin (8px).
  const ambiguousInput: EngineInput = {
    raw: { x: 142.5, y: 115, tMs: 1000 },
    targets: [targetA, targetB],
    geometryRevision: 1,
    configRevision: 1
  };

  let out = engine.step(ambiguousInput);
  assert.strictEqual(out.ambiguous, true, 'Should be flagged as ambiguous when competing targets are equidistant');
  assert.strictEqual(out.candidateId, null, 'Ambiguous target state must not assign a candidate');
  assert.strictEqual(out.dwellProgress, 0);

  // Now cursor moves distinctly closer to targetA: x = 120 (inside targetA)
  const clearInput: EngineInput = {
    raw: { x: 120, y: 115, tMs: 1050 },
    targets: [targetA, targetB],
    geometryRevision: 1,
    configRevision: 1
  };

  out = engine.step(clearInput);
  assert.strictEqual(out.ambiguous, false);
  assert.strictEqual(out.candidateId, 'btn-a');
});
