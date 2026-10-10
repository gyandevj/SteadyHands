# Signal Analysis Source Layout Plan (`analysis/src/PLAN.md`)

**Owner:** Person 4 (Dedeepya)  
**Directory:** `analysis/src/`  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This directory contains the Python package source tree for `steadyhand_signal`. The code is structured as an in-process scientific computing library using standard NumPy and SciPy operations.

### Boundaries
- No I/O operations (no network sockets, file writes, database connections).
- No web framework dependencies (no FastAPI, Starlette, Pydantic HTTP).
- No Arduino serial/USB communication code.

---

## 2. Current Repository State

- `analysis/src/steadyhand_signal/` exists as an empty directory scaffold.
- No Python code files exist.

---

## 3. Proposed Package Structure

```text
analysis/src/
├── PLAN.md                                    # This plan
└── steadyhand_signal/
    ├── PLAN.md                                # Module details plan
    ├── __init__.py                            # Public API exports
    ├── models.py                              # Strongly-typed dataclasses
    ├── validation.py                          # Quality checks & timestamp verification
    ├── resampler.py                           # Uniform time grid resampling
    ├── spectral.py                            # Detrending, windowing, FFT, PSD
    ├── features.py                            # Energy, dominant peak, concentration
    ├── state.py                               # Motion state machine & hysteresis
    ├── calibration.py                         # Baseline gravity & noise floor
    └── blanking.py                            # Haptic artifact blanking
```

---

## 4. Dependencies and Environment

- **Python Runtime:** Python 3.10+
- **Core Dependencies:**
  - `numpy >= 1.24.0` (vectorized math, arrays, FFT)
  - `scipy >= 1.10.0` (signal detrending, window functions)
- **Development Dependencies:**
  - `pytest >= 7.0.0` (unit testing)
  - `mypy >= 1.0.0` (strict static typing)

---

## 5. Implementation Sequence

1. `models.py`: Establish type definitions matching `docs/contracts.md`.
2. `validation.py` & `resampler.py`: Clean and align raw sample arrays.
3. `spectral.py`: Core mathematical FFT and PSD transformation.
4. `features.py` & `state.py`: Extract domain metrics and advisory states.
5. `calibration.py` & `blanking.py`: Stationary baseline and haptic blanking.
6. `__init__.py`: Export `analyze_window` and `calibrate_stationary`.

---

## 6. Failure Handling

All exceptions inside `analyze_window` are caught and mapped to a valid `MotionResult` with:
- `quality.state = 'degraded'`
- `quality.reasons = ['internal_calculation_error']`
- `motion.status = 'unknown'`
- All metrics set to `None`.

---

## 7. Acceptance Criteria

- `mypy --strict analysis/src/steadyhand_signal` passes with zero errors.
- Library imports cleanly without side-effects.

---

## 8. Team Handoff

- **Receiver:** Dev (Person 1).
- **Import Statement:**
  ```python
  from steadyhand_signal import analyze_window, calibrate_stationary, MotionResult
  ```

---

## 9. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) setting up the Python source tree in analysis/src/.

Read analysis/src/PLAN.md and analysis/src/steadyhand_signal/PLAN.md.

TASK:
1. Initialize analysis/src/steadyhand_signal/__init__.py.
2. Ensure strict type hints and mypy compatibility across all submodules.
3. Package all pure signal routines into clean, testable units.
```
