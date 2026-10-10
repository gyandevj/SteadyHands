import test from 'node:test';
import assert from 'node:assert';
import { ExponentialFilter } from '../../packages/engine/src/filters/exponential.ts';
import type { Point } from '../../packages/engine/src/types.ts';

test('ExponentialFilter - initialization snaps to first point', () => {
  const filter = new ExponentialFilter(1.0);
  const p1: Point = { x: 100, y: 200, tMs: 1000 };
  const out = filter.filter(p1);

  assert.strictEqual(out.x, 100);
  assert.strictEqual(out.y, 200);
  assert.strictEqual(out.tMs, 1000);
});

test('ExponentialFilter - time-aware smoothing attenuates step jump', () => {
  const filter = new ExponentialFilter(1.0); // 1.0 Hz cutoff
  filter.filter({ x: 0, y: 0, tMs: 1000 });

  // Step input from 0 to 100 over 16.67ms (approx 60 Hz frame)
  // dt = 0.01667s, alpha = 1 - exp(-2 * PI * 1.0 * 0.01667) ≈ 1 - exp(-0.1047) ≈ 0.0995
  const out = filter.filter({ x: 100, y: 100, tMs: 1016.67 });

  // Expected out ≈ 0 + 0.0995 * 100 ≈ 9.95
  assert.ok(out.x > 8 && out.x < 12, `Filtered X was ${out.x}, expected ~9.95`);
  assert.ok(out.y > 8 && out.y < 12, `Filtered Y was ${out.y}, expected ~9.95`);
});

test('ExponentialFilter - variable dt invariance', () => {
  // Compare two 100ms transitions:
  // Route A: single 100ms step
  // Route B: six 16.67ms steps (approx 100ms)
  const filterA = new ExponentialFilter(1.0);
  filterA.filter({ x: 0, y: 0, tMs: 1000 });
  const outA = filterA.filter({ x: 100, y: 0, tMs: 1100 });

  const filterB = new ExponentialFilter(1.0);
  filterB.filter({ x: 0, y: 0, tMs: 1000 });
  let outB: Point = { x: 0, y: 0, tMs: 1000 };
  for (let i = 1; i <= 6; i++) {
    outB = filterB.filter({ x: 100, y: 0, tMs: 1000 + i * (100 / 6) });
  }

  // The final smoothed position after equivalent elapsed time should match closely (< 1px)
  const diff = Math.abs(outA.x - outB.x);
  assert.ok(diff < 1.0, `Route A (${outA.x}) vs Route B (${outB.x}) difference was ${diff}`);
});

test('ExponentialFilter - duplicate timestamp handling (dt <= 0)', () => {
  const filter = new ExponentialFilter(1.0);
  filter.filter({ x: 10, y: 10, tMs: 1000 });
  const dup = filter.filter({ x: 50, y: 50, tMs: 1000 }); // Same tMs

  // Should retain previous output, not divide by zero
  assert.strictEqual(dup.x, 10);
  assert.strictEqual(dup.y, 10);
});

test('ExponentialFilter - long pause recovery (dt > 1000ms snaps position)', () => {
  const filter = new ExponentialFilter(1.0);
  filter.filter({ x: 10, y: 10, tMs: 1000 });

  // 3 second gap
  const resume = filter.filter({ x: 500, y: 500, tMs: 4000 });

  // Must snap cleanly to new position rather than dragging slowly
  assert.strictEqual(resume.x, 500);
  assert.strictEqual(resume.y, 500);
});

test('ExponentialFilter - nonfinite input rejection', () => {
  const filter = new ExponentialFilter(1.0);
  filter.filter({ x: 10, y: 10, tMs: 1000 });

  const invalid = filter.filter({ x: NaN, y: Infinity, tMs: 1016 });
  assert.strictEqual(invalid.x, 10);
  assert.strictEqual(invalid.y, 10);
});
