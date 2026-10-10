# Pure Motion-Analysis Master Plan (`analysis/PLAN.md`)

**Owner:** Person 4 (Dedeepya)  
**Package:** `steadyhand_signal`  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

The `analysis/` package is an installable, pure Python signal processing library (`steadyhand_signal`). It extracts physical motion features and estimates movement stability from 3-axis accelerometer samples streaming from the Arduino UNO Q peripheral.

### Core Responsibilities
- **Signal Quality Assessment:** Validating timestamp continuity, packet loss, sensor saturation, and hardware timing jitter.
- **Spectral Decomposition:** Computing normalized Power Spectral Density (PSD) across individual spatial axes using windowed Fast Fourier Transforms (FFT).
- **Motion Characterization:** Extracting exploratory band power ($3\text{–}12\text{ Hz}$), dominant oscillation frequencies, and spectral concentration.
- **Stationary Calibration:** Calculating baseline gravitational orientation and noise floors to parameterize sensitivity thresholds.
- **Haptic Contamination Blanking:** Flagging and excluding sensor intervals contaminated by actuator vibration.

### Architectural Boundaries
- **Strictly Pure Logic:** Zero dependencies on FastAPI, WebSockets, serial ports, file systems, or network hardware.
- **Integration Boundary:** Dev (Person 1) owns the hardware sampling loop, I2C driver, ring buffers, WebSocket routing, and session endpoints. Dev imports `steadyhand_signal` as an in-process library and invokes `analyze_window()` on rolling memory buffers.

---

## 2. Current Repository State

- `analysis/README.md` exists describing package scope.
- `analysis/src/steadyhand_signal/` exists as an empty directory scaffold.
- No Python code, build manifests (`pyproject.toml`), or tests exist yet.

---

## 3. Proposed File Structure

```text
analysis/
├── README.md
├── PLAN.md                                    # This plan
├── pyproject.toml                             # Packaging config (setuptools/flit)
├── plans/                                     # Focused architectural specifications
│   ├── sample-validation-and-timebase.md
│   ├── windowing-and-spectral-analysis.md
│   ├── motion-quality-and-advisory-output.md
│   ├── calibration-and-baselines.md
│   ├── haptic-artifact-handling.md
│   └── backend-integration.md
└── src/
    ├── PLAN.md                                # Source layout plan
    └── steadyhand_signal/
        ├── PLAN.md                            # Library module plan
        ├── __init__.py                        # Package exports (analyze_window, calibrate_stationary)
        ├── models.py                          # Data models (SensorSample, MotionResult, QualityState)
        ├── validation.py                      # Timing, sequence, gap, and saturation checks
        ├── resampler.py                       # Monotonic timestamp uniform resampling
        ├── spectral.py                        # Per-axis detrend, Hann window, PSD, axis sum
        ├── features.py                        # Band power (3-12 Hz), peak Hz, concentration
        ├── state.py                           # Motion state classification & persistence
        ├── calibration.py                     # Stationary noise floor & baseline subtraction
        └── blanking.py                        # Haptic pulse exclusion and settling intervals
```

---

## 4. Interfaces and Data Contracts

Conforming strictly to `docs/contracts.md`:

### Core Models (`models.py`)
```python
from dataclasses import dataclass
from typing import List, Optional, Tuple, Literal

QualityState = Literal['warming_up', 'good', 'degraded', 'stale', 'haptic_blanking', 'unavailable']
MotionStatus = Literal['quiet', 'periodic_motion', 'other_motion', 'unknown']

@dataclass(frozen=True)
class SensorCapability:
    model: str                # e.g. "LIS3DHTR", "ADXL345", "MMA7660FC"
    odr_hz: float             # Configured Output Data Rate (e.g. 100.0 or 120.0 Hz)
    range_g: float            # Measurement range (e.g. 2.0 g)
    resolution_bits: int      # ADC resolution (e.g. 6, 10, 12, 13 bits)
    units: str = "g"

@dataclass(frozen=True)
class SensorSample:
    seq: int
    t_us: int                 # Microsecond monotonic MCU timestamp
    a_g: Tuple[float, float, float]  # (ax, ay, az) in units of g
    valid: bool
    saturated: bool
    haptic_active: bool

@dataclass(frozen=True)
class WindowQuality:
    state: QualityState
    reasons: List[str]
    measured_hz: float
    missing_fraction: float
    max_gap_ms: float

@dataclass(frozen=True)
class MotionFeatures:
    status: MotionStatus
    dominant_hz: Optional[float]
    band_rms_g: Optional[float]
    band_power_ratio: Optional[float]
    peak_concentration: Optional[float]

@dataclass(frozen=True)
class AdvisoryRecommendation:
    id: str
    preset: Literal['light', 'steady']
    requires_user_acceptance: bool = True
    reason_code: str = "persistent_motion_during_task"

@dataclass(frozen=True)
class MotionResult:
    quality: WindowQuality
    motion: MotionFeatures
    recommendation: Optional[AdvisoryRecommendation]
```

### Primary Public Functions
```python
def analyze_window(
    samples: List[SensorSample],
    calibration: Optional[CalibrationResult],
    capability: SensorCapability
) -> MotionResult:
    """Pure, bounded signal analysis over a 2.0s window. No I/O."""

def calibrate_stationary(
    samples: List[SensorSample],
    capability: SensorCapability
) -> CalibrationResult:
    """Computes gravitational baseline and noise floor over 3.0s stationary window."""
```

---

## 5. Implementation Sequence

### Stage 1: Models & Validation (P0)
1. Define typed dataclasses in `src/steadyhand_signal/models.py`.
2. Implement validation in `validation.py` (monotonic $t_{\mu s}$, sequence gaps, saturation checks).
3. Implement `resampler.py` for acceptable short gaps ($<40\text{ ms}$).

### Stage 2: Spectral Analysis & Features (P0)
1. Implement per-axis detrending, Hann windowing, and one-sided PSD in `spectral.py`.
2. Implement feature extraction in `features.py` ($3\text{–}12\text{ Hz}$ band RMS, peak Hz, concentration).
3. Validate spectral peak recovery within $\pm 0.5\text{ Hz}$ on synthetic test signals.

### Stage 3: Quality Gates, Calibration & Blanking (P1)
1. Implement `calibration.py` (stationary noise floor).
2. Implement `blanking.py` (haptic pulse exclusion $+ 500\text{ ms}$ settling).
3. Implement `state.py` (hysteresis between `quiet` and `periodic_motion`).
4. Assemble public exports in `__init__.py`.

---

## 6. Failure Handling

1. **Window With Missing Samples ($>5\%$ missing or gap $>40\text{ ms}$):**
   - Quality state becomes `degraded`.
   - Feature metrics (`dominant_hz`, `band_rms_g`) are set to `None`.
   - Recommendation is set to `None`.
2. **Motor Activity Contamination:**
   - Quality state becomes `haptic_blanking`.
   - Output fields set to `None`.
3. **Sensor Disconnection / Stale Stream ($>500\text{ ms}$ without sample):**
   - Flagged by Dev's service layer as `stale` or `unavailable`.

---

## 7. Acceptance Criteria

- **Spectral Accuracy:** Synthetic $5.0\text{ Hz}$ and $8.0\text{ Hz}$ test signals with Gaussian noise recover peak frequency within $\pm 0.5\text{ Hz}$ (one FFT bin).
- **Honest Null Output:** A window containing corrupted timestamps or motor pulses returns `quality.state != 'good'` and `dominant_hz = None`.
- **Performance:** `analyze_window()` executes in $< 5.0\text{ ms}$ for 240 samples.

---

## 8. Team Handoff

- **Receiver:** Dev (Person 1).
- **Artifact:** Installable Python package `steadyhand_signal`.
- **Consumer Verification:** Dev imports the library in FastAPI, feeds sliding buffer windows, and publishes JSON frames matching `docs/contracts.md`.

---

## 9. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing the pure Python signal analysis package steadyhand_signal.

Read analysis/PLAN.md, docs/contracts.md, docs/hardware.md, and analysis/plans/windowing-and-spectral-analysis.md.

ALLOWED EDITS:
- analysis/**
- tests/analysis/**

TASK:
1. Create analysis/pyproject.toml configuring the package steadyhand_signal.
2. Implement analysis/src/steadyhand_signal/models.py declaring SensorSample, SensorCapability, WindowQuality, MotionFeatures, MotionResult, CalibrationResult.
3. Implement validation.py and resampler.py for timestamp continuity and short-gap interpolation.
4. Implement spectral.py (per-axis detrend, Hann window, one-sided PSD, summed axis PSD).
5. Implement features.py (3-12 Hz band RMS, parabolic peak Hz, concentration).
6. Implement calibration.py (stationary noise floor) and blanking.py (haptic settling).
7. Implement __init__.py exporting analyze_window and calibrate_stationary.
8. Implement tests/analysis/ verifying:
   - Peak recovery for 5Hz and 8Hz synthetic waves.
   - Rejection of gapped (>40ms) or saturated windows.
   - Proper null outputs on corrupted data.

Verify all tests pass with pytest.
```
