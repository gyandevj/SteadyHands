# Experiment Controls and Metrics Plan (`apps/fixtures/plans/experiment-controls-and-metrics.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document defines the metrics collection, experimental controls, and data logging framework for SteadyHand evaluations. It ensures that task measurements remain scientifically valid, reproducible, and completely unprivileged.

### Ethical & Privacy Mandate
- **Zero Personal Data:** The experiment harness NEVER collects or stores entered form strings, user names, emails, credentials, or full URLs.
- **Session Identifiers:** Trials are logged under anonymous, pseudorandom session identifiers (e.g. `trial-session-a10f`).

---

## 2. Quantitative Metric Definitions

1. **Movement Time ($MT$):** Time in milliseconds from the visual appearance of a target until its successful selection.
2. **Task Completion Time ($TCT$):** Total elapsed time from clicking "Start Task" to completing a full multi-field form.
3. **Throughput ($TP$):** Fitts' Law index of performance in bits per second:
   $$TP = \frac{ID_e}{MT} = \frac{\log_2(D / W_e + 1)}{MT} \quad (\text{bits/s})$$
4. **Error Rate ($ER$):** Percentage of trials where the user clicked outside the target boundary before acquiring it.
5. **Dwell Cancellation Rate ($CR$):** Number of times dwell progress commenced ($>0.1$) but was aborted before reaching $1.0$.

---

## 3. Data Schema (`task_harness.js`)

Exported benchmark JSON:

```json
{
  "schema_version": 1,
  "session_id": "trial-session-a10f",
  "timestamp_utc": "2026-10-10T14:30:00Z",
  "browser_user_agent": "Mozilla/5.0 ... Chrome/116.0",
  "screen_resolution": "1920x1080",
  "mode": "stabilized_dwell",
  "preset": "steady",
  "trials": [
    {
      "trial_index": 1,
      "target_width_px": 48,
      "target_distance_px": 300,
      "index_of_difficulty_bits": 2.85,
      "movement_time_ms": 1420.5,
      "errors": 0,
      "cancellations": 1,
      "completed": true
    }
  ],
  "aggregate": {
    "mean_mt_ms": 1385.2,
    "median_mt_ms": 1350.0,
    "throughput_bps": 2.15,
    "error_rate_percent": 4.2
  }
}
```

---

## 4. Acceptance Criteria

- Harness computes metrics accurately against known timer test runs.
- JSON exports strictly exclude sensitive text and validate against the schema.

---

## 5. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing experiment metrics in apps/fixtures/.

Read apps/fixtures/plans/experiment-controls-and-metrics.md.

ALLOWED EDITS:
- apps/fixtures/scripts/task_harness.js

TASK:
1. Implement scripts/task_harness.js computing Movement Time, Errors, Cancellations, and Throughput.
2. Provide JSON and CSV download functionality.
3. Enforce strict exclusion of form text and personal identifiers.
```
