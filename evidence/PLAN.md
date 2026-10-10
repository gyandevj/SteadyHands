# Evaluation Evidence Master Plan (`evidence/PLAN.md`)

**Owner:** Person 4 (Dedeepya) — Evidence Coordinator  
**Contributors:** All Team Members  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This subsystem coordinates the empirical evaluation evidence for SteadyHand. Rather than relying on marketing claims or preloaded numbers, the hackathon pitch will be grounded in transparent engineering trade-offs, reproducible benchmarks, and honest capability limits.

### Ethical & Scientific Policy
1. **No Predetermined Improvements:** Never pre-populate results with claims like "reduces error by 80%" or "takes 45s vs gave up" before running actual trials.
2. **Convenience Population Transparency:** Trials conducted by teammates are labeled as **developer convenience trials**, not clinical trials on individuals with pathological motor impairments.
3. **Privacy First:** Evidence artifacts contain no personal identifiers, video recordings, entered text, or credential strings.

---

## 2. Current Repository State

- `evidence/README.md` exists detailing evidence ownership.
- No benchmark plots, log summaries, or experimental results exist yet.

---

## 3. Proposed File Structure

```text
evidence/
├── README.md
├── PLAN.md                                    # This plan
├── plans/                                     # Focused architectural specifications
│   ├── evaluation-protocol.md
│   ├── benchmark-results-and-plots.md
│   └── demo-evidence-and-claims.md
├── benchmarks/                                # Machine-readable trial data (JSON)
│   ├── offline_filter_pareto.json             # Jitter vs lag across filter settings
│   └── interactive_task_trials.json          # Task trials across modes
├── plots/                                     # Publication-quality charts (PNG/SVG)
│   ├── pareto_jitter_vs_lag.png               # Filter trade-off curve
│   ├── psd_dominant_peaks.png                 # Sensor spectral analysis
│   └── completion_time_by_mode.png            # Task timing comparisons
├── compatibility/                             # Browser compatibility record
│   └── matrix.md                              # Pass/fail outcomes across standard controls
├── photos/                                    # Hardware verification records
│   └── uno_q_wiring.jpg                       # Clear photograph of board, bus, and sensor
└── scripts/
    ├── run_engine_benchmarks.ts               # Offline filter evaluation runner
    └── plot_spectral_evidence.py              # Matplotlib chart generator
```

---

## 4. Evidence Categories

| Category | Source | Metrics Collected | Honest Limitations Disclosed |
| :--- | :--- | :--- | :--- |
| **Offline Numerical Benchmarks** | Seeded synthetic cursor traces | $RMSE$ error (px), phase lag (ms), throughput. | Mathematical simulation; does not capture human closed-loop neuromotor feedback. |
| **Spectral Signal Accuracy** | Seeded IMU signals & recorded hardware | Peak frequency error (Hz), power ratio, blanking settling time. | Sensor resolution dependent (e.g. 6-bit vs 12-bit); fixed mounting required. |
| **Interactive Form Tasks** | Fixture pages (`apps/fixtures/tasks.html`) | Movement time (ms), error clicks, dwell cancellations, timeouts. | Convenience sample size ($N=4$ teammates); learning effects observed. |
| **System Reliability Checks** | Full system restart | Unplug recovery, worker restart, layout shift cancellation. | Internal browser pages not supported; iframe support deferred to P2. |

---

## 5. Acceptance Criteria

- All charts include clear axis labels, engineering units, and data source tags (`synthetic`, `recorded`, `developer_trial`).
- The evidence bundle can be fully regenerated from clean repository checkouts using automated scripts.

---

## 6. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) setting up the evidence evaluation framework in evidence/.

Read evidence/PLAN.md and evidence/plans/evaluation-protocol.md.

ALLOWED EDITS:
- evidence/**

TASK:
1. Implement scripts/run_engine_benchmarks.ts executing offline filter comparisons and outputting benchmarks/offline_filter_pareto.json.
2. Implement scripts/plot_spectral_evidence.py rendering Pareto and spectral charts.
3. Provide evidence/compatibility/matrix.md template.
```
