# Sensor Signal Generation Plan (`fixtures/plans/sensor-signal-generation.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document details the synthetic IMU signal generator (`fixtures/generators/generate_imu_signals.py`). It produces mathematically controlled 3-axis acceleration signals with known ground-truth spectral content to validate `steadyhand_signal`.

---

## 2. Mathematical Signal Models

All signals assume nominal output data rate $F_s = 100.0\text{ Hz}$ ($T_s = 10,000\mu s$):

### 1. Static Gravity & Electronic Noise
$$a_x(t) = \eta_x(t), \quad a_y(t) = \eta_y(t), \quad a_z(t) = 1.0\text{ g} + \eta_z(t)$$
Where $\eta \sim \mathcal{N}(0, \sigma^2)$ with $\sigma = 0.005\text{ g}$.
- **Expected Outcome:** `status = 'quiet'`, `dominant_hz = None`.

### 2. Pure Sinusoidal Oscillation ($5.0\text{ Hz}$ and $8.0\text{ Hz}$)
$$a_x(t) = A_1 \sin(2\pi f_1 t) + \eta_x(t), \quad a_y(t) = A_1 \cos(2\pi f_1 t) + \eta_y(t), \quad a_z(t) = 1.0 + \eta_z(t)$$
Where $f_1 = 5.0\text{ Hz}$ and $A_1 = 0.04\text{ g}$.
- **Expected Outcome:** `status = 'periodic_motion'`, $f_{dominant} = 5.0 \pm 0.2\text{ Hz}$, $RMS_{band} \approx 0.04 / \sqrt{2} \approx 0.028\text{ g}$.

### 3. Dual-Frequency Harmonic Signal ($5.0\text{ Hz} + 8.0\text{ Hz}$)
$$a_x(t) = 0.03\sin(2\pi \cdot 5.0 t) + 0.02\sin(2\pi \cdot 8.0 t) + \eta_x(t)$$
- **Expected Outcome:** Dominant frequency identified at primary energy peak ($5.0\text{ Hz}$); secondary peak visible in PSD plot.

### 4. Gapped Sample Stream
Introduces a $45\text{ ms}$ gap (5 consecutive missing samples) at $t = 1.2\text{ s}$.
- **Expected Outcome:** Validation flags `max_gap_ms = 45.0`, `quality.state = 'degraded'`, metrics return `None`.

### 5. Sensor Saturation
A severe jerk transient exceeding the dynamic range ($a_x(t) = 2.5\text{ g}$ clipped to $2.0\text{ g}$, `saturated = True`).
- **Expected Outcome:** `quality.state = 'degraded'`, `reasons = ['sensor_saturation_detected']`.

### 6. Actuator Pulse & Ringing
At $t = 1.0\text{ s}$, a $40\text{ ms}$ pulse with $a_{peak} = 1.5\text{ g}$ is injected with `haptic_active = True`, followed by exponentially damped ringing ($\tau = 150\text{ ms}$).
- **Expected Outcome:** `quality.state = 'haptic_blanking'`.

---

## 3. Acceptance Criteria

- Generates schema-valid JSON batches for each condition.
- Unit tests verify that spectral analysis recovers $5.0\text{ Hz}$ and $8.0\text{ Hz}$ peaks within $\pm 0.2\text{ Hz}$.

---

## 4. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing synthetic IMU signal generation in fixtures/generators/.

Read fixtures/plans/sensor-signal-generation.md.

ALLOWED EDITS:
- fixtures/generators/generate_imu_signals.py
- fixtures/synthetic/signals/**

TASK:
1. Implement generate_imu_signals.py generating:
   - Quiet baseline.
   - 5.0 Hz and 8.0 Hz pure sines.
   - Dual-tone signals.
   - Gapped stream (45ms gap).
   - Clipped saturation.
   - Haptic pulse with mechanical ringing.
2. Save files to fixtures/synthetic/signals/.
3. Verify test signals with pytest tests/analysis/.
```
