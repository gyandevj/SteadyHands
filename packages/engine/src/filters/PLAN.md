# Pointer Filtering Module Plan (`packages/engine/src/filters/PLAN.md`)

**Owner:** Person 4 (Dedeepya)  
**Directory:** `packages/engine/src/filters/`  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This module implements discrete-time pointer smoothing algorithms. It reduces high-frequency hand tremors while balancing user-perceived responsiveness and latency.

### Filters Planned
1. **Passthrough Filter (`raw_virtual`):** Directly relays raw coordinates for the agreed developer technical stress test and baseline benchmarking.
2. **Exponential Filter:** A time-aware first-order Infinite Impulse Response (IIR) low-pass filter. Simple, predictable baseline.
3. **One Euro Filter:** A speed-adaptive dual-stage low-pass filter (Casiez, Roussel, & Vogel, 2012) that aggressively filters jitter at low speeds while reducing phase lag during rapid ballistic movements.

### Boundaries
- Pure mathematical functions operating on viewport coordinates $(x, y)$ in CSS pixels and monotonic timestamps $t$ in milliseconds.
- No OS cursor control or mouse driver interception.

---

## 2. Current Repository State

- `packages/engine/src/filters/` exists as an empty directory scaffold.
- No filter source code currently exists.

---

## 3. Proposed File Structure

```text
packages/engine/src/filters/
├── PLAN.md                                    # This plan
├── types.ts                                   # IPointerFilter interface and FilterState
├── passthrough.ts                             # RawPassthroughFilter
├── exponential.ts                             # ExponentialFilter implementation
└── one_euro.ts                                # OneEuroFilter implementation
```

---

## 4. Interfaces and Mathematical Formulations

### Filter Contract
```typescript
export interface FilterState {
  readonly x: number;
  readonly y: number;
  readonly tMs: number;
}

export interface IPointerFilter {
  readonly name: 'passthrough' | 'exponential' | 'one_euro';
  filter(point: Point): Point;
  reset(point?: Point): void;
}
```

### 1. Passthrough Filter
- Simply echoes `Point(raw.x, raw.y, raw.tMs)`.
- Used when `AssistanceConfig.mode === 'raw_virtual'`.

### 2. Time-Aware Exponential Filter
For non-uniform sampling intervals $\Delta t = t_k - t_{k-1}$ in seconds:
$$\alpha = 1 - e^{-2 \pi f_c \Delta t}$$
Where:
- $f_c$ is the cutoff frequency in Hertz (default range: $0.5\text{ Hz}$ to $5.0\text{ Hz}$).
- $\Delta t = (t_k - t_{k-1}) / 1000.0$.
- If $\Delta t \le 0$, $\hat{x}_k = \hat{x}_{k-1}$.
- Filter recurrence:
$$\hat{x}_k = \hat{x}_{k-1} + \alpha (x_k - \hat{x}_{k-1})$$
$$\hat{y}_k = \hat{y}_{k-1} + \alpha (y_k - \hat{y}_{k-1})$$

### 3. One Euro Speed-Adaptive Filter
Operates in two coupled stages:
1. **Filtered Derivative (Speed Estimation):**
   Raw velocity at step $k$:
   $$v_{x,k} = \frac{x_k - \hat{x}_{k-1}}{\Delta t}, \quad v_{y,k} = \frac{y_k - \hat{y}_{k-1}}{\Delta t}$$
   Filtered velocity using derivative cutoff frequency $f_{c,d}$ (typically $1.0\text{ Hz}$):
   $$\alpha_d = \frac{1}{1 + \frac{1}{2 \pi f_{c,d} \Delta t}}$$
   $$\hat{v}_{x,k} = \hat{v}_{x,k-1} + \alpha_d (v_{x,k} - \hat{v}_{x,k-1})$$
   $$\hat{v}_{y,k} = \hat{v}_{y,k-1} + \alpha_d (v_{y,k} - \hat{v}_{y,k-1})$$
   Overall speed magnitude:
   $$\hat{v}_k = \sqrt{\hat{v}_{x,k}^2 + \hat{v}_{y,k}^2}$$

2. **Adaptive Position Cutoff:**
   $$f_c = f_{c,min} + \beta \cdot \hat{v}_k$$
   Where:
   - $f_{c,min}$ is the minimum cutoff frequency (Hz) at zero speed (suppresses resting jitter, e.g. $1.0\text{ Hz}$).
   - $\beta$ is the speed coefficient (Hz / (px/s)) controlling dynamic lag reduction (e.g. $0.002$).

3. **Position Filtering:**
   $$\alpha = \frac{1}{1 + \frac{1}{2 \pi f_c \Delta t}}$$
   $$\hat{x}_k = \hat{x}_{k-1} + \alpha (x_k - \hat{x}_{k-1})$$
   $$\hat{y}_k = \hat{y}_{k-1} + \alpha (y_k - \hat{y}_{k-1})$$

---

## 5. Implementation Sequence

### Stage 1: Exponential & Passthrough (P0)
1. Define `IPointerFilter` in `src/filters/types.ts`.
2. Implement `PassthroughFilter` in `src/filters/passthrough.ts`.
3. Implement `ExponentialFilter` in `src/filters/exponential.ts`.
4. Add unit tests for variable $\Delta t$, non-monotonic timestamps, and pause reset ($\Delta t > 1.0\text{ s}$).

### Stage 2: One Euro Filter (P1)
1. Implement `OneEuroFilter` in `src/filters/one_euro.ts` following Casiez (2012).
2. Validate against Casiez reference test vectors.
3. Add velocity clamping to prevent numerical explosion during sudden large pointer teleportation.

---

## 6. Failure Handling

- **Sampling Gap / Pause ($\Delta t > 1000\text{ ms}$):** When the pointer stops and resumes after a long pause, treating $\Delta t = 1.0\text{ s}$ yields $\alpha \approx 1.0$, which correctly snaps the filter to the new position. If $\Delta t > 2000\text{ ms}$, explicitly call `reset(point)`.
- **Clock Rollover / Reversal ($\Delta t < 0$):** Retain previous output; do not update velocity or position.
- **NaN / Infinity Inputs:** Reject sample; return previous filtered coordinate.

---

## 7. Acceptance Criteria

- **Jitter Reduction:** On a synthetic stationary trace perturbed with Gaussian jitter ($\sigma = 5\text{ px}$ at $60\text{ Hz}$):
  - Exponential filter ($f_c = 1.0\text{ Hz}$) reduces trajectory standard deviation by $>70\%$.
  - One Euro filter ($f_{c,min} = 1.0\text{ Hz}, \beta = 0.002$) reduces standard deviation by $>75\%$.
- **Ballistic Responsiveness:** On a rapid $500\text{ px}$ ballistic movement ($>1000\text{ px/s}$):
  - One Euro filter adapts cutoff to $>15\text{ Hz}$, cutting lag by $>50\%$ compared to static exponential filter.
- **Numerical Stability:** Filter outputs remain finite numbers across 100,000 continuous steps.

---

## 8. Team Handoff

- **Receiver:** `packages/engine/src/engine.ts`.
- **Artifact:** Filter classes implementing `IPointerFilter`.
- **Consumer Verification:** Engine instantiates filters and switches active filter based on `AssistanceConfig.filter.kind`.

---

## 9. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing pointer filters for SteadyHand.

Read packages/engine/src/filters/PLAN.md and docs/contracts.md.

ALLOWED EDITS:
- packages/engine/src/filters/**
- tests/engine/**

TASK:
1. Implement packages/engine/src/filters/types.ts declaring IPointerFilter and FilterConfig.
2. Implement packages/engine/src/filters/passthrough.ts for raw_virtual testing.
3. Implement packages/engine/src/filters/exponential.ts with time-aware alpha = 1 - Math.exp(-2 * Math.PI * cutoff * dt).
4. Implement packages/engine/src/filters/one_euro.ts with dual-stage derivative filtering and adaptive cutoff fc = min_cutoff + beta * speed.
5. Implement unit tests in tests/engine/ checking:
   - Variable dt behavior (16.6ms, 33.3ms, 8.3ms).
   - Long pause recovery (dt > 1000ms).
   - Finite output guarantees on noisy input.
   - One Euro speed adaptation at slow vs fast velocities.

Verify that all tests pass. Report implementation details and mathematical constants.
```
