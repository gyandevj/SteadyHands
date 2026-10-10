# Pointer Trace Generation Plan (`fixtures/plans/pointer-trace-generation.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

To measure the effectiveness of pointer filtering objectively, we must know the user's **intended cursor trajectory** separate from the injected disturbance. This plan defines the mathematical trajectory generator in `fixtures/generators/generate_pointer_traces.ts`.

---

## 2. Intended Ground-Truth Trajectories

### 1. Stationary Hover
- Intended position is perfectly still:
  $$x_{true}(t) = x_0, \quad y_{true}(t) = y_0$$
- Evaluates residual stationary jitter ($RMS_{error}$).

### 2. Constant-Velocity Linear Sweep
- Linear motion between $(x_0, y_0)$ and $(x_1, y_1)$ at speed $v = 400\text{ px/s}$:
  $$x_{true}(t) = x_0 + v_x \cdot t, \quad y_{true}(t) = y_0 + v_y \cdot t$$
- Evaluates filter drag and dynamic tracking error.

### 3. Rapid Ballistic Movement with Corrective Overshoot
Modeled using Flash & Hogan’s (1985) Minimum Jerk Model for human voluntary reaching:
$$s(\tau) = 10\tau^3 - 15\tau^4 + 6\tau^5, \quad \tau = \frac{t}{T} \in [0, 1]$$
At the end of the ballistic phase ($\tau = 1$), a damped overshoot correction is appended:
$$x_{true}(t) = x_{target} + A_{over} \cdot e^{-\lambda t} \cos(2\pi f_{corr} t)$$
- Evaluates filter response during sudden deceleration and fine aiming.

---

## 3. Injected Perturbations & Disturbances

The raw coordinate fed to the engine is:
$$x_{raw}(t) = x_{true}(t) + \eta_x(t) + T_x(t)$$
Where:
1. **Sensor Measurement Noise ($\eta_x$):** Zero-mean Gaussian noise $\mathcal{N}(0, \sigma^2)$ with $\sigma = 2.0\text{ to }5.0\text{ px}$.
2. **Technical Stress Disturbance ($T_x$):** Seeded sinusoidal oscillation modeling hand tremor ($4\text{–}8\text{ Hz}$):
   $$T_x(t) = A_{tremor} \cdot \sin(2\pi f_{tremor} t + \phi)$$
   Where $A_{tremor} = 8.0\text{ px}$ and $f_{tremor} = 5.5\text{ Hz}$.
3. **Variable Timing:** Samples emitted with random inter-event jitter:
   $$\Delta t \sim \mathcal{U}(14.0\text{ ms}, 18.0\text{ ms}) \quad (\text{nominal } 60\text{ Hz})$$

---

## 4. Benchmark Quantitative Metrics

Comparing filtered output $\hat{x}(t)$ against ground truth $x_{true}(t)$:
1. **Tracking Root Mean Square Error ($RMSE$):**
   $$RMSE = \sqrt{\frac{1}{N}\sum_{k=1}^N \left[(\hat{x}_k - x_{true,k})^2 + (\hat{y}_k - y_{true,k})^2\right]}$$
2. **Phase Lag / Response Delay ($\Delta t_{lag}$):**
   Time shift that maximizes the cross-correlation between $\hat{x}(t)$ and $x_{true}(t)$.
3. **Jitter Attenuation Ratio ($JAR$):**
   $$JAR = 1.0 - \frac{RMSE_{filtered}}{RMSE_{raw}}$$

---

## 5. Acceptance Criteria

- Seeded generator produces bit-identical traces on repeat runs.
- Intended ground-truth coordinates are stored alongside raw coordinates in the trace file.

---

## 6. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing the pointer trace generator in fixtures/generators/.

Read fixtures/plans/pointer-trace-generation.md.

ALLOWED EDITS:
- fixtures/generators/generate_pointer_traces.ts
- fixtures/synthetic/traces/**

TASK:
1. Implement generate_pointer_traces.ts supporting:
   - Stationary hover.
   - Constant-velocity line.
   - Minimum-jerk ballistic movement with overshoot.
   - Seeded Gaussian and sinusoidal disturbance injection.
2. Generate benchmark traces in fixtures/synthetic/traces/.
3. Verify that true and raw positions are properly serialized.
```
