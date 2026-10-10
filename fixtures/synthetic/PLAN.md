# Synthetic Datasets Plan (`fixtures/synthetic/PLAN.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This directory contains deterministic, mathematically generated test vectors for the interaction engine and signal processing pipeline. Synthetic datasets establish absolute ground truth, allowing exact measurement of tracking errors, phase lag, and spectral estimation accuracy.

---

## 2. Directory Layout

```text
fixtures/synthetic/
├── PLAN.md                                    # This plan
├── traces/                                    # Pointer coordinates (JSON)
│   ├── stationary_jitter_seed42.json
│   ├── straight_line_clean.json
│   ├── straight_line_noisy_seed42.json
│   ├── ballistic_overshoot_seed42.json
│   └── variable_rate_30_to_144hz.json
└── signals/                                   # 3-axis IMU acceleration (JSON)
    ├── quiet_baseline_100hz.json
    ├── pure_sine_5hz_100hz.json
    ├── pure_sine_8hz_100hz.json
    ├── multi_tone_5hz_8hz_100hz.json
    ├── saturation_clipped_100hz.json
    ├── gapped_stream_45ms.json
    └── haptic_pulse_40ms_cooldown.json
```

---

## 3. Dataset Specifications

### A. Pointer Traces Schema
```json
{
  "trace_id": "straight_line_noisy_seed42",
  "seed": 42,
  "sampling_rate_hz": 60.0,
  "duration_s": 5.0,
  "ground_truth_trajectory": "linear_constant_velocity",
  "noise_model": "gaussian_white_noise",
  "noise_sigma_px": 4.5,
  "samples": [
    { "t_ms": 0.0, "true_x": 100.0, "true_y": 100.0, "raw_x": 103.2, "raw_y": 98.7 },
    { "t_ms": 16.67, "true_x": 105.0, "true_y": 100.0, "raw_x": 104.1, "raw_y": 102.3 }
  ]
}
```

### B. IMU Signals Schema
```json
{
  "signal_id": "pure_sine_5hz_100hz",
  "seed": 42,
  "odr_hz": 100.0,
  "duration_s": 3.0,
  "components": [
    { "type": "gravity", "vector_g": [0.0, 0.0, 1.0] },
    { "type": "sine", "axis": "x", "freq_hz": 5.0, "amplitude_g": 0.04 },
    { "type": "noise", "sigma_g": 0.005 }
  ],
  "samples": [
    { "seq": 0, "t_us": 0, "a_g": [0.003, 0.001, 0.998], "valid": true, "saturated": false, "haptic_active": false },
    { "seq": 1, "t_us": 10000, "a_g": [0.015, -0.002, 1.002], "valid": true, "saturated": false, "haptic_active": false }
  ]
}
```

---

## 4. Acceptance Criteria

- All files pass JSON linting and validate against schema.
- Re-running generators reproduces bit-identical outputs.

---

## 5. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) generating synthetic datasets in fixtures/synthetic/.

Read fixtures/synthetic/PLAN.md and fixtures/plans/pointer-trace-generation.md.

TASK:
1. Generate synthetic traces in fixtures/synthetic/traces/.
2. Generate synthetic IMU signals in fixtures/synthetic/signals/.
3. Verify deterministic reproducibility across runs.
```
