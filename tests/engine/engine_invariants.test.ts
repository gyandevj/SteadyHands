import test from 'node:test';
import assert from 'node:assert';
import { createInteractionEngine } from '../../packages/engine/src/engine.ts';
import { PRESETS } from '../../packages/engine/src/presets.ts';
import type { EngineInput, Target } from '../../packages/engine/src/types.ts';

const testTarget: Target = {
  id: 'name-field',
  rect: { x: 100, y: 100, width: 200, height: 48 },
  kind: 'focus',
  enabled: true,
  dwellAllowed: true,
};

test('InteractionEngine - stationary repeated steps advance dwell', () => {
  const engine = createInteractionEngine(PRESETS.steady); // 1000ms duration
  let selectionReceived = false;

  // Simulate mouse staying at (150, 120) inside target for 1200ms
  for (let t = 1000; t <= 2200; t += 50) {
    const input: EngineInput = {
      raw: { x: 150, y: 120, tMs: t },
      targets: [testTarget],
      geometryRevision: 1,
      configRevision: 1,
    };
    const out = engine.step(input);
    if (out.selection) {
      assert.strictEqual(out.selection.targetId, 'name-field');
      selectionReceived = true;
    }
  }

  assert.strictEqual(selectionReceived, true);
});

test('InteractionEngine - geometryRevision change cancels active dwell', () => {
  const engine = createInteractionEngine(PRESETS.steady);

  // Hover for 600ms (progress ~0.6)
  for (let t = 1000; t <= 1600; t += 50) {
    engine.step({
      raw: { x: 150, y: 120, tMs: t },
      targets: [testTarget],
      geometryRevision: 1,
      configRevision: 1,
    });
  }

  // Page scrolls / reflows -> geometryRevision bumped to 2
  const shiftOutput = engine.step({
    raw: { x: 150, y: 120, tMs: 1650 },
    targets: [testTarget],
    geometryRevision: 2,
    configRevision: 1,
  });

  // Dwell progress MUST be reset to 0.0
  assert.strictEqual(shiftOutput.dwellProgress, 0.0);
  assert.strictEqual(shiftOutput.selection, null);
});

test('InteractionEngine - pause / wake from sleep resets filter without lag', () => {
  const engine = createInteractionEngine(PRESETS.steady);

  // Position at (100, 100)
  engine.step({
    raw: { x: 100, y: 100, tMs: 1000 },
    targets: [],
    geometryRevision: 1,
    configRevision: 1,
  });

  // 5 second pause (tab switched / CPU slept) -> pointer at (500, 500)
  const resume = engine.step({
    raw: { x: 500, y: 500, tMs: 6000 },
    targets: [],
    geometryRevision: 1,
    configRevision: 1,
  });

  // Filter should snap immediately to new coordinate
  assert.strictEqual(resume.pointer.x, 500);
  assert.strictEqual(resume.pointer.y, 500);
});

test('InteractionEngine - raw_virtual bypass returns exact coordinates', () => {
  const rawVirtualConfig = {
    ...PRESETS.light,
    mode: 'raw_virtual' as const,
  };
  const engine = createInteractionEngine(rawVirtualConfig);

  const out = engine.step({
    raw: { x: 123.45, y: 678.9, tMs: 1000 },
    targets: [],
    geometryRevision: 1,
    configRevision: 1,
  });

  assert.strictEqual(out.pointer.x, 123.45);
  assert.strictEqual(out.pointer.y, 678.9);
});
