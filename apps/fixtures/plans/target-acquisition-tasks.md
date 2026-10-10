# Target Acquisition Tasks Plan (`apps/fixtures/plans/target-acquisition-tasks.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document defines the discrete target acquisition benchmark page (`tasks.html`). Grounded in ISO 9241-9 pointing device evaluation standards, this page provides reproducible, quantitative metrics for movement time, error rates, and user throughput across different assistance modes.

---

## 2. Experimental Design (Fitts’ Law Paradigm)

The task measures the time required for a user to move the pointer from an origin to a target of width $W$ located at distance $D$:
$$ID = \log_2\left(\frac{D}{W} + 1\right) \quad (\text{bits})$$
Movement Time ($MT$) follows:
$$MT = a + b \cdot ID$$

### Experimental Conditions
- **Target Widths ($W$):** $24\text{ px}$ (difficult/small), $48\text{ px}$ (standard), $96\text{ px}$ (generous).
- **Target Distances ($D$):** $150\text{ px}$ (short), $300\text{ px}$ (medium), $600\text{ px}$ (long ballistic).
- **Indices of Difficulty ($ID$):** Range from $1.36\text{ bits}$ ($D=150, W=96$) to $4.70\text{ bits}$ ($D=600, W=24$).

---

## 3. Task Page Architecture (`tasks.html`)

```html
<div id="experiment-container">
  <div id="experiment-header">
    <h3>Target Acquisition Benchmark</h3>
    <div id="trial-hud">Trial: <span id="trial-num">0</span> / 12 | Mode: <span id="active-mode">Stabilized</span></div>
  </div>

  <div id="arena">
    <!-- Targets are dynamically rendered sequentially at fixed coordinates -->
    <button class="target-btn active" style="left: 100px; top: 250px; width: 48px; height: 48px;">1</button>
  </div>

  <div id="results-panel" class="hidden">
    <h4>Trial Results</h4>
    <table id="metrics-table"></table>
    <button id="download-json">Export Benchmark JSON</button>
  </div>
</div>
```

---

## 4. Measurement Protocol

1. User clicks the centered "Start" button.
2. Target 1 highlights in green.
3. User navigates to Target 1 and activates it (either via assisted click or dwell).
4. Upon activation, Target 1 turns gray, and Target 2 appears at distance $D$.
5. The local harness records:
   - $MT$ (Movement Time in ms from target appearance to selection).
   - $Errors$ (Mis-clicks outside target bounds).
   - $Cancellations$ (Number of times dwell started but aborted due to leaving target).
6. Sequence repeats for 12 trials per condition.

---

## 5. Acceptance Criteria

- Targets render with pixel-perfect dimensions.
- Target transitions execute instantaneously ($<5\text{ ms}$).
- Generates downloadable JSON summary containing trial timing.

---

## 6. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing target acquisition benchmark tasks in apps/fixtures/.

Read apps/fixtures/plans/target-acquisition-tasks.md.

ALLOWED EDITS:
- apps/fixtures/tasks.html
- apps/fixtures/scripts/task_harness.js

TASK:
1. Implement tasks.html with a centered arena and trial HUD.
2. Implement scripts/task_harness.js managing 12 sequential pointing trials across widths 24px, 48px, 96px and distances 150px, 300px, 600px.
3. Log Movement Time, errors, and cancellations to a results table and downloadable JSON.
```
