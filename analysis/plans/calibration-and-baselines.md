# Stationary Calibration and Baselines Plan (`analysis/plans/calibration-and-baselines.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document details the stationary calibration routine in `steadyhand_signal.calibration`. Calibration captures the baseline gravitational vector and resting sensor noise floor while the mouse rests stationary on the desk.

### Purpose
1. Establishes the static gravitational orientation vector $(\mu_x, \mu_y, \mu_z)$ for coordinate alignment.
2. Quantifies the electronic noise floor ($\sigma_{noise}$) and quantization limits of the attached sensor chip.
3. Sets a baseline threshold so subtle resting vibrations or sensor thermal drift are not misclassified as intentional motion.

---

## 2. Calibration Procedure & Data Requirements

- **Duration:** $3.0\text{ seconds}$ of stationary data ($N = 300\text{ samples}$ at $100\text{ Hz}$).
- **User Instruction (Dashboard):** "Place mouse flat on the desk and keep hands completely still for 3 seconds."
- **Rejection Gate:** If the user bumps the desk or moves the mouse during the 3-second window, the calibration is rejected with a clear explanation rather than saving an invalid baseline.

---

## 3. Mathematical Formulation (`calibrate_stationary`)

### Step 1: Mean Gravitational Vector
$$\mu_x = \frac{1}{N}\sum a_x[n], \quad \mu_y = \frac{1}{N}\sum a_y[n], \quad \mu_z = \frac{1}{N}\sum a_z[n]$$
Static magnitude:
$$g_{mag} = \sqrt{\mu_x^2 + \mu_y^2 + \mu_z^2}$$

### Step 2: Noise Floor Standard Deviation
For each axis $u \in \{x, y, z\}$:
$$\sigma_u = \sqrt{\frac{1}{N}\sum (a_u[n] - \mu_u)^2}$$
Total resting noise floor:
$$\sigma_{total} = \sqrt{\sigma_x^2 + \sigma_y^2 + \sigma_z^2}$$

### Step 3: Stationarity Quality Validation
1. **Magnitude Sanity Check:**
   Earth gravity must be approximately $1.0\text{ g}$.
   $$0.85\text{ g} \le g_{mag} \le 1.15\text{ g}$$
   If outside this range, the accelerometer is uncalibrated, saturated, or defective.
2. **Dynamic Movement Rejection:**
   If the mouse was moved during calibration:
   $$\sigma_{total} > 0.05\text{ g}$$
   Reject calibration (`stationary_valid = false`, reason: `"excessive_movement_during_calibration"`).

---

## 4. Invalidation Triggers

A saved `CalibrationResult` becomes invalid upon:
1. **Device Reboot:** Identified by a change in `boot_id`.
2. **Sensor Reconfiguration:** Any change in sensor range ($\pm 2\text{ g}$ vs $\pm 4\text{ g}$) or ODR ($100\text{ Hz}$ vs $120\text{ Hz}$).
3. **Physical Remount:** Re-orienting the sensor board on the mouse alters the gravity projection across axes.

---

## 5. Acceptance Criteria

- A synthetic quiet trace ($1.0\text{ g}$ gravity + $0.005\text{ g}$ Gaussian noise) produces `stationary_valid = true` and accurately captures $\sigma_{total}$.
- A trace containing a simulated bump ($0.2\text{ g}$ spike) is rejected with `stationary_valid = false`.

---

## 6. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing stationary calibration in steadyhand_signal.calibration.

Read analysis/plans/calibration-and-baselines.md and docs/contracts.md.

ALLOWED EDITS:
- analysis/src/steadyhand_signal/calibration.py
- tests/analysis/**

TASK:
1. Implement calibrate_stationary computing gravitational mean vector and noise standard deviation.
2. Enforce quality gates: gravity magnitude in [0.85g, 1.15g] and noise std < 0.05g.
3. Return CalibrationResult with stationary_valid boolean and failure reasons list.
4. Implement tests/analysis/test_calibration.py verifying quiet pass and bump rejection.
```
