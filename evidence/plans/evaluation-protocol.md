# Evaluation Protocol Plan (`evidence/plans/evaluation-protocol.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document details the rigorous evaluation protocol comparing SteadyHand's assistance modes against native mouse interaction.

---

## 2. Experimental Conditions

1. **Condition 1 (Native):** Standard unmodified browser pointer interaction with physical mouse clicks. Baseline for comparison.
2. **Condition 2 (Raw Virtual):** Virtual pointer rendered with zero smoothing, subject to the developer synthetic stress disturbance.
3. **Condition 3 (Exponential):** First-order low-pass filter with fixed cutoff $f_c = 1.0\text{ Hz}$.
4. **Condition 4 (One Euro):** Speed-adaptive filter with $f_{c,min} = 1.0\text{ Hz}$ and $\beta = 0.002$.
5. **Condition 5 (Stabilized + Dwell):** One Euro filter combined with $800\text{ ms}$ cancellable dwell activation.

---

## 3. Honest Multi-Dimensional Trade-Off Metrics

Every assistive intervention introduces both advantages and costs. We report both transparently:

```mermaid
quadrantChart
    title Assistive Trade-Off Landscape
    x-axis Low Latency --> High Latency (Drag)
    y-axis High Jitter --> Low Jitter (Stability)
    quadrant-1 "Over-filtered (Sluggish)"
    quadrant-2 "Ideal Adaptive Region (One Euro)"
    quadrant-3 "Native / Unassisted (Jittery)"
    quadrant-4 "High Lag & Low Stability"
    "Native": [0.1, 0.2]
    "Exponential (1Hz)": [0.85, 0.85]
    "Exponential (3Hz)": [0.45, 0.55]
    "One Euro": [0.35, 0.88]
```

### Measured Benefits
- **Jitter Attenuation:** Reduction in trajectory standard deviation during stationary aiming ($\text{px}$).
- **Target Miss Reduction:** Decreased count of erroneous clicks outside target boundaries.
- **Physical Effort Reduction:** Ability to complete forms via dwell without executing physical mouse clicks.

### Measured Engineering Costs
- **Phase Lag:** Time delay between raw hand motion and virtual cursor movement ($\text{ms}$).
- **Movement Time ($MT$) Inflation:** Additional time required to acquire targets due to filter drag and dwell wait duration ($800\text{ ms}$).
- **Dwell Cancellation Overhead:** Time expended when a dwell attempt is started but aborted due to slight hand drift.

---

## 4. Counterbalancing & Learning Effect Mitigation

Because participants become faster with practice:
- **Latin Square Order:** The presentation order of modes is randomized across trial blocks (e.g. Block 1: Native $\rightarrow$ Stabilized $\rightarrow$ Dwell; Block 2: Dwell $\rightarrow$ Native $\rightarrow$ Stabilized).
- **Timeouts:** A trial that is not completed within $15.0\text{ seconds}$ is recorded as `timed_out = true`. It is NEVER assigned an invented completion time.

---

## 5. Acceptance Criteria

- Protocol generates reproducible benchmark tables.
- Reports both positive stabilization metrics and negative latency costs.

---

## 6. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing evaluation protocols in evidence/.

Read evidence/plans/evaluation-protocol.md.

TASK:
1. Provide evaluation trial recording scripts in evidence/scripts/run_task_eval.ts.
2. Structure output schema to capture trade-offs (lag vs jitter, completion vs timeouts).
```
