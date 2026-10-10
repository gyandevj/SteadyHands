# Timing, Reset, and Failure Handling Plan (`packages/engine/plans/timing-reset-and-failure-handling.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document establishes the robust edge-case handling rules for the pointer interaction engine under irregular timing, sensor interruptions, browser throttling, and invalid input coordinates.

### Core Philosophy
The interaction engine must be mathematically resilient. It must never crash, produce `NaN`, enter an infinite loop, or exhibit erratic cursor jumps regardless of whatever pathological inputs the browser environment provides.

---

## 2. Timing Edge Cases & Mitigations

### 1. Variable Event Rates
Modern input devices emit samples at wildly varying rates:
- Standard office mouse: $60\text{–}125\text{ Hz}$.
- Gaming mice: $500\text{–}1000\text{ Hz}$.
- Throttled background tabs: $<1\text{ Hz}$.
- High-refresh displays: $120\text{–}240\text{ Hz}$ animation frame rates.

**Mitigation:** All filter coefficients $\alpha$ are computed dynamically using actual $\Delta t = (t_k - t_{k-1}) / 1000.0$. The filter response is physically invariant with respect to sampling rate.

### 2. Duplicate or Out-of-Order Timestamps ($\Delta t \le 0$)
Some browser engines emit batched pointer events with identical `performance.now()` timestamps, or occasionally out-of-order timestamps due to multi-threaded event dispatching.
- **Rule:** If $t_k \le t_{k-1}$, treat $\Delta t$ as zero.
- **Action:** Retain previous filtered coordinate $(\hat{x}_{k-1}, \hat{y}_{k-1})$. Do NOT divide by $\Delta t$ (prevents `Infinity` in velocity calculation).

### 3. Sampling Gaps / Tab Backgrounding ($\Delta t > 1000\text{ ms}$)
When the user switches tabs, minimizes the window, or leaves the computer:
- **Rule:** A time gap $>1000\text{ ms}$ indicates a discontinuity, not continuous slow movement.
- **Action:** Automatically trigger an internal `reset()`:
  - Snap filtered position directly to raw position: $\hat{x}_k = x_k, \hat{y}_k = y_k$.
  - Reset velocity estimators to zero.
  - Abort active dwell timers immediately.

### 4. Nonfinite Inputs ($x, y = \text{NaN}, \pm\infty$)
May occur if unvalidated DOM attributes or corrupted data pass through.
- **Action:** Discard corrupted input immediately. Output last known valid filtered point.

---

## 5. State Reset Matrix

| Trigger Event | Source | Filter Action | Dwell Action | Targeting Action |
| :--- | :--- | :--- | :--- | :--- |
| `engine.cancel(reason)` | Content Script (Escape / Blur) | No change | Progress $\rightarrow 0.0$, state $\rightarrow \text{Idle}$ | Clear candidate lock |
| `engine.reset(point)` | Re-enable / Teleport | Snap to point, zero velocity | State $\rightarrow \text{Idle}$, progress $\rightarrow 0.0$ | Clear candidate |
| `geometryRevision` bump | Page scroll / DOM resize | No change | Progress $\rightarrow 0.0$, state $\rightarrow \text{Idle}$ | Rescan targets |
| `configRevision` bump | Settings updated in popup | Reset with new filter config | Progress $\rightarrow 0.0$, state $\rightarrow \text{Idle}$ | Re-evaluate with new radius |
| Time gap $> 1000\text{ ms}$ | Tab switch / sleep | Snap to new point | Cancel active dwell | Reset candidate |

---

## 6. Implementation Details

```typescript
export class InteractionEngineImpl implements InteractionEngine {
  private lastTimeMs: number = -1;
  private lastGeomRev: number = -1;
  private lastConfigRev: number = -1;

  public step(input: EngineInput): EngineOutput {
    const { raw, targets, geometryRevision, configRevision } = input;

    // 1. Validate numerical inputs
    if (!Number.isFinite(raw.x) || !Number.isFinite(raw.y) || !Number.isFinite(raw.tMs)) {
      return this.lastValidOutput;
    }

    // 2. Check revisions
    if (geometryRevision !== this.lastGeomRev || configRevision !== this.lastConfigRev) {
      this.dwellFsm.cancel("revision_changed");
      this.lastGeomRev = geometryRevision;
      this.lastConfigRev = configRevision;
    }

    // 3. Check time gaps
    if (this.lastTimeMs > 0) {
      const dtMs = raw.tMs - this.lastTimeMs;
      if (dtMs > 1000) {
        this.filter.reset(raw);
        this.dwellFsm.cancel("time_gap");
      }
    }
    this.lastTimeMs = raw.tMs;

    // 4. Proceed with normal pipeline...
  }
}
```

---

## 7. Acceptance Criteria

- Feeding `NaN` coordinates does not throw and leaves output stable.
- Simulating a $5\text{ second}$ gap in `step()` calls snaps the cursor to the new coordinate without lingering lag.
- Fast sequential revision bumps cancel dwell cleanly without memory leaks.

---

## 8. Team Handoff

- **Receiver:** Person 3.
- **Contract:** Robust engine that handles browser quirks silently and predictably.

---

## 9. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing timing, resets, and error handling in packages/engine/.

Read packages/engine/plans/timing-reset-and-failure-handling.md and docs/contracts.md.

ALLOWED EDITS:
- packages/engine/src/**
- tests/engine/**

TASK:
1. Update packages/engine/src/engine.ts to handle:
   - Nonfinite coordinate inputs (NaN, Infinity).
   - Duplicate or decreasing timestamps (dt <= 0).
   - Time discontinuities (dt > 1000ms) with automatic filter snap and dwell cancel.
   - Geometry and config revision mismatch detection.
2. Implement tests/engine/timing_resets.test.ts testing all timing edge cases.

Verify all tests pass.
```
