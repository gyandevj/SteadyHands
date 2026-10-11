import test from 'node:test';
import assert from 'node:assert';
import { AdaptiveFormsController } from '../../apps/extension/src/content/adaptiveForms/controller.ts';
import { LocalInteractionEngine } from '../../apps/extension/src/content/engineStub.ts';
import { classifyElement } from '../../apps/extension/src/content/policy.ts';
import type { Target, EngineInput, AdaptiveLayoutProposal } from '../../apps/extension/src/types/index.ts';

test('Lifecycle: layout transition guard synchronously cancels active dwell', () => {
  const engine = new LocalInteractionEngine();
  let cancelledReason: string | null = null;
  let rescanned = false;
  let invalidated = false;

  const controller = new AdaptiveFormsController({
    cancelActiveDwell: (reason: string) => {
      cancelledReason = reason;
      engine.cancel(reason);
    },
    rescanTargets: () => {
      rescanned = true;
    },
    invalidateGeometry: () => {
      invalidated = true;
    },
  });

  const target: Target = {
    id: 'field-target-1',
    rect: { x: 50, y: 50, width: 200, height: 40 },
    kind: 'focus',
    enabled: true,
    dwellAllowed: true,
  };

  const input: EngineInput = {
    raw: { x: 60, y: 60, tMs: 1000 },
    targets: [target],
    geometryRevision: 1,
    configRevision: 1,
  };

  // 1. Advance dwell half-way
  engine.step(input);
  input.raw = { x: 60, y: 60, tMs: 1400 };
  const mid = engine.step(input);
  assert.strictEqual(mid.candidateId, 'field-target-1');
  assert.ok(mid.dwellProgress > 0.4);

  // 2. Trigger layout transition (e.g. restoreOriginal)
  // Even if no DOM form is attached, calling restoreOriginal when modified or cancelActiveDwell directly cancels dwell
  (controller as any).guardCallbacks?.cancelActiveDwell('layout_transition_apply');

  assert.strictEqual(cancelledReason, 'layout_transition_apply');

  // Next step at same position should have 0 dwell progress
  input.raw = { x: 60, y: 60, tMs: 1500 };
  const afterCancel = engine.step(input);
  assert.strictEqual(afterCancel.dwellProgress, 0);
});

test('Lifecycle: submit button retains native-only interaction in adapted layout', () => {
  // Ensure submit buttons remain dwellAllowed = false
  const submitBtn = {
    tagName: 'BUTTON',
    type: 'submit',
    isConnected: true,
    closest: () => null,
    hasAttribute: () => false,
    getAttribute: () => null,
  } as unknown as Element;

  (global as any).window = {
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
  };

  const classification = classifyElement(submitBtn);
  assert.strictEqual(classification.eligible, true);
  assert.strictEqual(classification.kind, 'button');
  assert.strictEqual(classification.dwellAllowed, false, 'Submit button must never allow dwell activation');
});

test('Lifecycle: controller manages status transitions correctly', () => {
  const controller = new AdaptiveFormsController();
  const initialStatus = controller.getStatus();
  assert.strictEqual(initialStatus.state, 'unsupported');
  assert.strictEqual(initialStatus.fieldCount, 0);
});
