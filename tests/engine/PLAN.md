# Pointer Engine Test Suite Plan (`tests/engine/PLAN.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document details the automated unit, property, and invariant test suite for the TypeScript pointer interaction engine (`packages/engine`). Built using Vitest, these tests ensure that all mathematical calculations, target arbitration decisions, and dwell transitions obey strict accessibility invariants.

---

## 2. Test Architecture & File Structure

```text
tests/engine/
├── PLAN.md                                    # This plan
├── filter_exponential.test.ts                 # Time-aware exponential filter tests
├── filter_one_euro.test.ts                    # One Euro filter velocity & lag tests
├── target_arbitrator.test.ts                  # Geometry distance, ambiguity & hysteresis
├── dwell_fsm.test.ts                          # Dwell FSM states, timing & rearm locks
├── engine_invariants.test.ts                  # End-to-end invariant validation
├── benchmark.test.ts                          # Performance latency & allocation budgets
└── mocks/
    └── targets.ts                             # Reusable mock target layouts
```

---

## 3. Invariant Test Matrix

| Test Suite | Invariant Tested | Assertions & Pass Criteria |
| :--- | :--- | :--- |
| `filter_exponential` | Variable $\Delta t$ invariance | Trajectory shape is identical at $60\text{ Hz}$ and $120\text{ Hz}$ under equivalent physical velocity. |
| `filter_exponential` | Nonfinite input rejection | Passing `NaN` coordinates outputs last valid coordinate; never emits `NaN`. |
| `filter_one_euro` | Speed-adaptive lag reduction | High-speed sweep ($1000\text{ px/s}$) exhibits $<30\text{ ms}$ lag; stationary hover attenuates jitter $>75\%$. |
| `target_arbitrator` | Boundary distance | $d = 0.0$ inside rect; Euclidean distance outside rect verified for corners and edges. |
| `target_arbitrator` | Ambiguity rejection | Equidistant pointer between two adjacent buttons outputs `ambiguous = true` and `candidateId = null`. |
| `target_arbitrator` | Hysteresis anti-flicker | Jittering across boundary by $\pm 2\text{ px}$ does not drop active candidate. |
| `dwell_fsm` | Exactly-once activation | 10-second continuous hover on an $800\text{ ms}$ target emits exactly one `SelectionEvent`. |
| `dwell_fsm` | Leave-to-rearm rule | Target cannot fire a second time without the pointer exiting and waiting `rearm_ms`. |
| `dwell_fsm` | Ineligible target safety | Hovering over target with `dwellAllowed = false` never emits `SelectionEvent`. |
| `engine_invariants` | Revision cancellation | Incrementing `geometryRevision` cancels dwell instantly; resets progress to 0.0. |
| `engine_invariants` | Pause / sleep recovery | $5\text{ s}$ pause between steps snaps filter cleanly without lingering slow drag. |

---

## 4. Execution & CI Configuration

Tests run via:
```bash
pnpm --filter @steadyhand/engine test
```
All tests must execute in $<2.0\text{ seconds}$ total.

---

## 5. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing tests in tests/engine/.

Read tests/engine/PLAN.md and docs/contracts.md.

ALLOWED EDITS:
- tests/engine/**

TASK:
1. Implement filter_exponential.test.ts and filter_one_euro.test.ts.
2. Implement target_arbitrator.test.ts testing boundary distance and ambiguity.
3. Implement dwell_fsm.test.ts testing exactly-once firing and leave-to-rearm.
4. Implement engine_invariants.test.ts verifying revision cancellation and pause recovery.
5. Verify 100% test pass rate with Vitest.
```
