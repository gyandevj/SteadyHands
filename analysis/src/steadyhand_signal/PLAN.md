# steadyhand_signal Package Architecture Plan (`analysis/src/steadyhand_signal/PLAN.md`)

**Owner:** Person 4 (Dedeepya)  
**Package:** `steadyhand_signal`  
**Status:** Planned / Architecture Phase  

---

## 1. Submodule Responsibilities

### `models.py`
Declares all immutable dataclasses:
- `SensorSample`, `SensorCapability`, `CalibrationResult`
- `WindowQuality`, `MotionFeatures`, `AdvisoryRecommendation`, `MotionResult`

### `validation.py`
Inspects raw sample arrays before numerical processing:
- `validate_window(samples: List[SensorSample], expected_odr: float) -> ValidationSummary`
- Checks: monotonic $t_{\mu s}$, duplicate timestamps, missing sequences ($\Delta seq > 1$), clipping saturation ($|a| \ge \text{range\_g}$), and haptic activity flags.

### `resampler.py`
Aligns unevenly spaced samples to a uniform time grid for FFT:
- `resample_to_grid(t_sec: np.ndarray, x: np.ndarray, target_fs: float) -> np.ndarray`
- Performs 1D linear interpolation across gaps $\le 40\text{ ms}$. If gap $> 40\text{ ms}$, raises `WindowGappedError`.

### `spectral.py`
Executes Fourier transformations:
- `compute_axis_psd(data: np.ndarray, fs: float) -> Tuple[np.ndarray, np.ndarray]`
- Linear detrending ($y = x - \mu$), Hann window application, $rfft$, power normalization ($2 / (N \cdot F_s \cdot S_2)$), and sum across $X, Y, Z$.

### `features.py`
Extracts physical motion features:
- `extract_features(freqs: np.ndarray, psd_sum: np.ndarray) -> MotionFeatures`
- Computes band RMS in $3.0\text{–}12.0\text{ Hz}$, total power, band power ratio, dominant frequency via parabolic interpolation, and peak spectral concentration.

### `state.py`
Applies thresholding and hysteresis to determine motion state:
- `classify_motion(features: MotionFeatures, calibration: Optional[CalibrationResult]) -> MotionStatus`
- Employs persistent observation (minimum 2 consecutive windows) before transitioning from `quiet` to `periodic_motion`.

### `calibration.py`
Stationary baseline processing:
- `calibrate_stationary(samples: List[SensorSample], capability: SensorCapability) -> CalibrationResult`
- Computes mean gravitational vector and noise standard deviation. Rejects window if dynamic acceleration variance exceeds $0.05\text{ g}$.

### `blanking.py`
Actuator blanking:
- `filter_haptic_artifacts(samples: List[SensorSample]) -> Tuple[List[SensorSample], bool]`
- Flags any window overlapping active haptics or within $500\text{ ms}$ post-pulse settling.

---

## 2. Public API Implementation (`__init__.py`)

```python
def analyze_window(
    samples: List[SensorSample],
    calibration: Optional[CalibrationResult],
    capability: SensorCapability
) -> MotionResult:
    # 1. Check blanking
    if any(s.haptic_active for s in samples):
        return MotionResult(
            quality=WindowQuality(state='haptic_blanking', reasons=['actuator_pulse_overlap'], ...),
            motion=MotionFeatures(status='unknown', dominant_hz=None, ...),
            recommendation=None
        )

    # 2. Validate timing and sequence
    v_summary = validate_window(samples, capability.odr_hz)
    if not v_summary.is_valid:
        return MotionResult(
            quality=WindowQuality(state='degraded', reasons=v_summary.reasons, ...),
            motion=MotionFeatures(status='unknown', dominant_hz=None, ...),
            recommendation=None
        )

    # 3. Resample and compute PSD
    t_sec, xyz = extract_arrays(samples)
    grid_xyz = resample_to_grid(t_sec, xyz, capability.odr_hz)
    freqs, psd_sum = compute_axis_psd(grid_xyz, capability.odr_hz)

    # 4. Extract features
    features = extract_features(freqs, psd_sum)

    # 5. Classify state & formulate recommendation
    status = classify_motion(features, calibration)
    rec = generate_recommendation(features, status)

    return MotionResult(
        quality=WindowQuality(state='good', reasons=[], ...),
        motion=replace(features, status=status),
        recommendation=rec
    )
```

---

## 3. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing steadyhand_signal in analysis/src/steadyhand_signal/.

Read analysis/src/steadyhand_signal/PLAN.md, docs/contracts.md, and docs/hardware.md.

ALLOWED EDITS:
- analysis/src/steadyhand_signal/**
- tests/analysis/**

TASK:
1. Implement models.py, validation.py, resampler.py, spectral.py, features.py, state.py, calibration.py, blanking.py.
2. Wire analyze_window and calibrate_stationary in __init__.py.
3. Verify test coverage with pytest tests/analysis/.
```
