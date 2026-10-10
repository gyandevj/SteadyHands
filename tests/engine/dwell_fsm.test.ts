import test from 'node:test';
import assert from 'node:assert';
import { DwellStateMachine } from '../../packages/engine/src/dwell/state_machine.ts';
import { DwellState } from '../../packages/engine/src/dwell/types.ts';
import type { DwellConfig } from '../../packages/engine/src/types.ts';

const config: DwellConfig = {
  enabled: true,
  duration_ms: 800,
  rearm_ms: 300,
};

test('DwellStateMachine - progress advances with monotonic time', () => {
  const fsm = new DwellStateMachine();

  // Step 1: acquire at t = 1000
  const s1 = fsm.step('inp-1', true, 1000, config);
  assert.strictEqual(s1.state, DwellState.CANDIDATE_ACQUIRED);
  assert.strictEqual(s1.progress, 0.0);
  assert.strictEqual(s1.selection, null);

  // Step 2: advance 400ms (50% progress)
  const s2 = fsm.step('inp-1', true, 1400, config);
  assert.strictEqual(s2.state, DwellState.DWELLING);
  assert.strictEqual(s2.progress, 0.5);
  assert.strictEqual(s2.selection, null);
});

test('DwellStateMachine - exactly-once selection dispatch on continuous hover', () => {
  const fsm = new DwellStateMachine();
  let selectionCount = 0;

  // Step through 5000ms at 16ms intervals (hovering for 5 seconds)
  for (let t = 1000; t <= 6000; t += 16) {
    const res = fsm.step('inp-1', true, t, config);
    if (res.selection !== null) {
      selectionCount++;
      assert.strictEqual(res.selection.targetId, 'inp-1');
    }
  }

  // MUST emit exactly once
  assert.strictEqual(selectionCount, 1, `Expected exactly 1 selection, got ${selectionCount}`);
  assert.strictEqual(fsm.getState(), DwellState.REARM_PENDING);
});

test('DwellStateMachine - leave-to-rearm cycle', () => {
  const fsm = new DwellStateMachine();

  // 1. Complete dwell (at t = 1800ms)
  fsm.step('chk-1', true, 1000, config);
  const activated = fsm.step('chk-1', true, 1800, config);
  assert.notStrictEqual(activated.selection, null);

  // 2. Continuous hover at t = 2000ms -> locked in REARM_PENDING
  const locked = fsm.step('chk-1', true, 2000, config);
  assert.strictEqual(locked.selection, null);

  // 3. User leaves target at t = 2100ms -> enters COOLDOWN
  fsm.step(null, false, 2100, config);
  assert.strictEqual(fsm.getState(), DwellState.COOLDOWN);

  // 4. Return to target before rearm_ms (300ms) expires -> at t = 2250 (elapsed 150ms) -> still blocked
  const prematureReturn = fsm.step('chk-1', true, 2250, config);
  assert.strictEqual(prematureReturn.selection, null);

  // 5. User leaves target again, waiting until rearm expires -> at t = 2500ms
  fsm.step(null, false, 2500, config);

  // 6. Return to target after rearm_ms (300ms) elapsed -> at t = 2850ms -> reacquired cleanly
  const reacquired = fsm.step('chk-1', true, 2850, config);
  assert.strictEqual(reacquired.state, DwellState.CANDIDATE_ACQUIRED);
});

test('DwellStateMachine - cancel immediately resets progress to 0.0', () => {
  const fsm = new DwellStateMachine();
  fsm.step('inp-1', true, 1000, config);
  fsm.step('inp-1', true, 1500, config); // 500ms in

  fsm.cancel('escape_key');
  assert.strictEqual(fsm.getState(), DwellState.IDLE);

  // Next step has progress 0.0
  const afterCancel = fsm.step(null, false, 1550, config);
  assert.strictEqual(afterCancel.progress, 0.0);
});

test('DwellStateMachine - ineligible target (dwellAllowed = false) never activates', () => {
  const fsm = new DwellStateMachine();

  // Hover over button that requires physical click
  for (let t = 1000; t <= 3000; t += 50) {
    const res = fsm.step('btn-submit', false, t, config);
    assert.strictEqual(res.progress, 0.0);
    assert.strictEqual(res.selection, null);
  }
});
