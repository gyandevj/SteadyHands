# Signal Analysis Test Suite Plan (`tests/analysis/PLAN.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document details the automated Python numerical and unit test suite for the `steadyhand_signal` package. Built using `pytest` and `numpy.testing`, these tests mathematically verify signal processing accuracy, quality gating, and edge-case handling.

---

## 2. Test Architecture & File Structure

```text
tests/analysis/
├── PLAN.md                                    # This plan
├── test_validation.py                         # Monotonicity, sequence gaps, saturation
├── test_resampler.py                          # Uniform grid interpolation & gap errors
├── test_spectral.py                           # FFT, PSD scaling, Parseval's theorem
├── test_features.py                           # Peak recovery (5Hz/8Hz), RMS, concentration
├── test_state.py                              # State classification, hysteresis & null rules
├── test_calibration.py                        # Stationary baseline & movement rejection
└── test_blanking.py                           # Haptic pulse exclusion & settling cooldown
```

---

## 3. Test Specifications & Assertions

| Test File | Test Case | Expected Behavior & Numeric Bounds |
| :--- | :--- | :--- |
| `test_validation.py` | Microsecond Rollover | A sample sequence wrapping across $2^{32} - 1$ computes $\Delta t$ correctly without negative intervals. |
| `test_validation.py` | Gap Threshold | Single gap $> 40\text{ ms}$ flags window as `is_valid = False` and `reasons = ['excessive_time_gap']`. |
| `test_validation.py` | Missing Fraction | Loss $> 5\%$ of samples flags `missing_fraction_exceeded`. |
| `test_spectral.py` | Parseval Energy Conservation | Time-domain variance $\frac{1}{N}\sum \tilde{x}[n]^2$ matches integrated PSD $\sum P(f) \Delta f$ within $\pm 2\%$. |
| `test_spectral.py` | Summed Axis Linearity | 3-axis PSD is identical to sum of individual 1-axis PSDs ($P_{total} = P_x + P_y + P_z$). |
| `test_features.py` | $5.0\text{ Hz}$ Peak Recovery | Pure $5.0\text{ Hz}$ synthetic sine wave recovers dominant frequency $f_{dominant} = 5.0 \pm 0.2\text{ Hz}$. |
| `test_features.py` | $8.0\text{ Hz}$ Peak Recovery | Pure $8.0\text{ Hz}$ synthetic sine wave recovers dominant frequency $f_{dominant} = 8.0 \pm 0.2\text{ Hz}$. |
| `test_state.py` | Honest Null Outputs | Corrupted or gapped window returns `dominant_hz is None`, `band_rms_g is None`, `recommendation is None`. |
| `test_state.py` | Persistence Hysteresis | A single anomalous noise window does not transition state from `quiet` to `periodic_motion`. |
| `test_calibration.py` | Quiet Stationary Pass | Quiet $1.0\text{ g}$ trace with $0.005\text{ g}$ noise produces `stationary_valid = True`. |
| `test_calibration.py` | Bump Rejection | Trace with $0.2\text{ g}$ bump produces `stationary_valid = False`. |
| `test_blanking.py` | Pulse Invalidation | Samples with `haptic_active = True` immediately force `quality.state = 'haptic_blanking'`. |

---

## 4. Execution Configuration

Run via:
```bash
pytest tests/analysis/ -v
```
All tests must execute in $<3.0\text{ seconds}$ total.

---

## 5. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing unit tests in tests/analysis/.

Read tests/analysis/PLAN.md and docs/contracts.md.

ALLOWED EDITS:
- tests/analysis/**

TASK:
1. Implement test_validation.py (rollover, gaps, missing fraction).
2. Implement test_spectral.py (Parseval conservation, summed PSD).
3. Implement test_features.py (5Hz and 8Hz synthetic peak recovery).
4. Implement test_state.py (honest null outputs, hysteresis).
5. Implement test_calibration.py (quiet pass vs bump rejection).
6. Implement test_blanking.py (haptic settling).
7. Verify all tests pass with pytest.
```
