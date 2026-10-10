# Input Datasets Master Plan (`fixtures/PLAN.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This subsystem provides deterministic, reproducible datasets for testing, benchmarking, and demonstrating the SteadyHand system. It encompasses:
1. **Synthetic Pointer Traces:** Mathematically defined cursor trajectories with seeded disturbances to evaluate pointer smoothing and target acquisition.
2. **Synthetic Sensor Waveforms:** Seeded 3-axis accelerometer time-series to test FFT peak recovery, gap rejection, and haptic blanking.
3. **Recorded Sensor Traces:** Captures from physical Grove accelerometers mounted to test mice, tagged with hardware provenance metadata.
4. **Replay Player:** Deterministic playback harnesses for automated test suites and dashboard demonstrations.

---

## 2. Current Repository State

- `fixtures/recorded/README.md` exists describing recording metadata requirements.
- `fixtures/synthetic/` exists as an empty directory scaffold.
- No trace generators, recorded data files, or replay scripts exist yet.

---

## 3. Proposed File Structure

```text
fixtures/
├── README.md
├── PLAN.md                                    # This master plan
├── plans/                                     # Focused architectural specifications
│   ├── pointer-trace-generation.md
│   ├── sensor-signal-generation.md
│   ├── recording-format-and-provenance.md
│   └── replay-and-reproducibility.md
├── synthetic/
│   ├── PLAN.md                                # Synthetic dataset plan
│   ├── traces/                                # Seeded JSON cursor traces
│   │   ├── straight_line_clean.json
│   │   ├── straight_line_noisy_seed42.json
│   │   ├── ballistic_overshoot_seed42.json
│   │   └── stationary_jitter_seed42.json
│   └── signals/                               # Seeded JSON 3-axis IMU streams
│       ├── quiet_gravity_100hz.json
│       ├── pure_5hz_sine_100hz.json
│       ├── multi_freq_5hz_8hz_100hz.json
│       ├── gapped_stream_45ms.json
│       └── haptic_pulse_40ms.json
├── recorded/
│   ├── README.md                              # Provenance guidelines
│   ├── PLAN.md                                # Recorded traces plan
│   └── traces/                                # Physical IMU captures (.json)
└── generators/
    ├── generate_pointer_traces.ts             # Deterministic TS trace generator
    └── generate_imu_signals.py                # Deterministic Python IMU generator
```

---

## 4. Dataset Taxonomy

| Dataset Category | Source Label | Intended Usage | Provenance Requirements |
| :--- | :--- | :--- | :--- |
| **Synthetic Pointer Traces** | `synthetic` | Evaluates filter latency vs jitter suppression in `tests/engine/`. | Pseudorandom seed, mathematical formula, noise parameters recorded in JSON header. |
| **Synthetic IMU Signals** | `synthetic` | Validates spectral peak recovery and quality rejection in `tests/analysis/`. | Sampling rate ($100\text{ Hz}$), frequency components, noise amplitude. |
| **Recorded Hardware Captures** | `recorded` | Offline testing with real physical sensor noise, cable tugs, and hand tremors. | Sensor model, bus, address, ODR, range, mount description, date, operator consent. |

---

## 5. Acceptance Criteria

- Generators produce bit-for-bit identical JSON files across operating systems given the same seed.
- Replay player streams samples matching recorded timestamps within $\pm 2\text{ ms}$.
- All recorded files strictly validate against canonical JSON schemas.

---

## 6. Team Handoff

- **Receiver:** Dev (for mock/replay service), Kripa (for dashboard debug replay), Person 4 (for unit tests and benchmarks).

---

## 7. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) setting up the fixtures dataset framework in fixtures/.

Read fixtures/PLAN.md, fixtures/plans/pointer-trace-generation.md, and fixtures/plans/sensor-signal-generation.md.

ALLOWED EDITS:
- fixtures/**

TASK:
1. Implement generators/generate_pointer_traces.ts generating seeded synthetic cursor trajectories.
2. Implement generators/generate_imu_signals.py generating seeded 3-axis IMU streams.
3. Generate initial synthetic datasets in fixtures/synthetic/traces/ and fixtures/synthetic/signals/.
4. Provide a replay utility in fixtures/replay.ts.
```
