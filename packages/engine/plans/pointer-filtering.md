# Pointer Filtering Detailed Plan (`packages/engine/plans/pointer-filtering.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document details the signal smoothing algorithms implemented in `packages/engine/src/filters/`. Pointer stabilization is essential for users with motor impairments or intentional hand tremors, but excessive filtering introduces disorienting lag. This plan establishes the mathematical framework, time-aware equations, and trade-off metrics.

---

## 2. Current Repository State

- Scaffolding exists in `packages/engine/src/filters/`.
- No filter implementations or mathematical test suites exist yet.

---

## 3. Mathematical Foundations & Implementation

### A. Raw Passthrough Filter (`passthrough.ts`)
- **Formula:** $\hat{x}_k = x_k, \quad \hat{y}_k = y_k$.
- **Purpose:** Developer test bypass (`raw_virtual`) and baseline ground truth. Does not smooth; introduces $0\text{ ms}$ latency.

### B. Time-Aware Exponential Filter (`exponential.ts`)
The classic continuous-time first-order low-pass filter with transfer function $H(s) = \frac{1}{1 + s\tau}$ where $\tau = \frac{1}{2\pi f_c}$.
In discrete time with variable time interval $\Delta t = t_k - t_{k-1}$:
$$\alpha_k = 1 - e^{-\frac{\Delta t}{\tau}} = 1 - e^{-2 \pi f_c \Delta t}$$
- **Recursion:**
  $$\hat{x}_k = \hat{x}_{k-1} + \alpha_k (x_k - \hat{x}_{k-1})$$
  $$\hat{y}_k = \hat{y}_{k-1} + \alpha_k (y_k - \hat{y}_{k-1})$$
- **Properties:**
  - Independent of sampling rate: behaves identically at $60\text{ Hz}$ and $144\text{ Hz}$.
  - Low $f_c$ ($1.0\text{ Hz}$): strong jitter attenuation, but notable lag during fast sweeps.
  - High $f_c$ ($5.0\text{ Hz}$): high responsiveness, but passes tremor jitter through.

### C. One Euro Filter (`one_euro.ts`)
Designed specifically for interactive user interfaces (Casiez et al., CHI 2012). It dynamically adjusts the low-pass cutoff frequency $f_c$ as a function of the user's instantaneous movement velocity.

1. **Velocity Estimation:**
   Raw discrete derivative:
   $$dx_k = \frac{x_k - \hat{x}_{k-1}}{\Delta t}, \quad dy_k = \frac{y_k - \hat{y}_{k-1}}{\Delta t}$$
   Filtered derivative using fixed derivative cutoff $f_{c,d} = 1.0\text{ Hz}$:
   $$\alpha_d = \frac{1}{1 + \frac{\tau_d}{\Delta t}} = \frac{2 \pi f_{c,d} \Delta t}{1 + 2 \pi f_{c,d} \Delta t}$$
   $$\hat{dx}_k = \hat{dx}_{k-1} + \alpha_d (dx_k - \hat{dx}_{k-1})$$
   $$\hat{dy}_k = \hat{dy}_{k-1} + \alpha_d (dy_k - \hat{dy}_{k-1})$$
   Scalar speed:
   $$v_k = \sqrt{\hat{dx}_k^2 + \hat{dy}_k^2} \quad (\text{px/s})$$

2. **Adaptive Position Cutoff:**
   $$f_{c,k} = f_{c,min} + \beta \cdot v_k$$
   Where:
   - $f_{c,min}$ is the minimum cutoff frequency (Hz) at zero speed (e.g. $1.0\text{ Hz}$).
   - $\beta$ is the velocity coefficient (Hz / (px/s)) (e.g. $0.002$).

3. **Position Filtering:**
   $$\alpha = \frac{2 \pi f_{c,k} \Delta t}{1 + 2 \pi f_{c,k} \Delta t}$$
   $$\hat{x}_k = \hat{x}_{k-1} + \alpha (x_k - \hat{x}_{k-1})$$
   $$\hat{y}_k = \hat{y}_{k-1} + \alpha (y_k - \hat{y}_{k-1})$$

---

## 4. Edge Cases & Robustness

1. **Zero or Negative $\Delta t$ ($\Delta t \le 0$):**
   Occurs if browser emits duplicate timestamps. Skip velocity and position update; return previous filtered point $(\hat{x}_{k-1}, \hat{y}_{k-1})$.
2. **Sampling Gaps ($\Delta t > 1000\text{ ms}$):**
   Occurs when mouse is idle, cursor leaves window, or tab is throttled. Snapping occurs naturally because $\alpha \rightarrow 1.0$ as $\Delta t \rightarrow \infty$. If $\Delta t > 2000\text{ ms}$, explicitly call `reset(x_k, y_k, t_k)`.
3. **Nonfinite Coordinates ($x, y = \text{NaN}$ or $\pm\infty$):**
   Immediately discard sample; retain last valid state.
4. **Velocity Spikes / Teleportation:**
   Clamp maximum velocity $v_k \le 10,000\text{ px/s}$ to prevent floating-point overflow.

---

## 5. Implementation Sequence

1. **Phase 1:** Implement `exponential.ts` and verify step-response curves against theoretical decay $1 - e^{-t/\tau}$.
2. **Phase 2:** Implement `one_euro.ts` and verify against Casiez's reference test vectors.
3. **Phase 3:** Create synthetic benchmark script comparing jitter reduction vs phase lag across both algorithms.

---

## 6. Failure Handling

If filter configuration specifies invalid numbers (e.g. $f_c \le 0$ or $\beta < 0$), clamp to safe fallback bounds:
- $0.1\text{ Hz} \le f_c \le 20.0\text{ Hz}$
- $0.0 \le \beta \le 1.0$
- $0.1\text{ Hz} \le f_{c,d} \le 10.0\text{ Hz}$

---

## 7. Acceptance Criteria

- **Stationary Jitter Suppression:** Reduces noise standard deviation of a $60\text{ Hz}$, $5\text{ px}$ Gaussian noise signal by $\ge 70\%$.
- **Latency at $1000\text{ px/s}$:** One Euro filter exhibits $\le 30\text{ ms}$ phase lag (compared to $>80\text{ ms}$ for fixed $1\text{ Hz}$ exponential filter).
- **Smoothness:** No high-frequency oscillation or ringing during constant-velocity sweeps.

---

## 8. Team Handoff

- **Receiver:** `packages/engine/src/engine.ts`.
- **Exports:** `ExponentialFilter`, `OneEuroFilter`, `PassthroughFilter`.

---

## 9. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing pointer filtering in packages/engine/src/filters/.

Read packages/engine/plans/pointer-filtering.md and docs/contracts.md.

ALLOWED EDITS:
- packages/engine/src/filters/**
- tests/engine/**

TASK:
1. Implement packages/engine/src/filters/exponential.ts with variable-dt alpha = 1 - Math.exp(-2 * Math.PI * cutoff * dt).
2. Implement packages/engine/src/filters/one_euro.ts with dual-stage derivative filtering and adaptive cutoff fc = min_cutoff + beta * speed.
3. Implement packages/engine/src/filters/passthrough.ts for raw bypass.
4. Implement tests/engine/filters.test.ts verifying:
   - Theoretical step response of exponential filter.
   - Low-speed noise attenuation vs high-speed lag reduction in One Euro.
   - Safe handling of dt <= 0, dt > 1000ms, and NaN.

Verify all tests pass.
```
