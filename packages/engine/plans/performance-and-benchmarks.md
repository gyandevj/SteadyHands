# Performance and Benchmarks Plan (`packages/engine/plans/performance-and-benchmarks.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

The pointer engine executes on every browser input event and during animation frames ($60\text{ to }144\text{ Hz}$). To guarantee that SteadyHand never causes dropped display frames or UI stutter, the complete execution of `step()` must adhere to a strict time and memory allocation budget.

### Performance Budgets
- **Execution Latency:** $\le 0.5\text{ ms}$ per `step()` invocation with 50 candidate targets on a standard laptop CPU.
- **Garbage Collection (GC) Impact:** Zero heap allocation in steady-state operation during continuous hover/movement.

---

## 2. Algorithmic Optimization Strategies

### 1. Spatial Pre-Filtering (Broadphase)
Comparing the pointer against 500 targets on a complex web app could take $O(N)$ square roots.
- **Optimization:** Use a quick bounding box Chebyshev distance pre-check before calculating Euclidean square roots:
  ```typescript
  // Fast rejection without Math.sqrt
  const approxDistX = Math.max(0, rect.x - px, px - (rect.x + rect.width));
  const approxDistY = Math.max(0, rect.y - py, py - (rect.y + rect.height));
  if (approxDistX > maxRadius || approxDistY > maxRadius) {
    continue; // Target is outside bounding box; skip full distance calculation
  }
  ```

### 2. Object Pool / Pre-allocated Output Buffers
Avoid instantiating new objects `{ pointer: ..., candidateId: ... }` on every `step()`:
- Maintain an internal mutable `EngineOutput` object and return a frozen/reusable reference, or allocate only when consumers require deep copies.

---

## 3. Microbenchmark Specification

Implemented in `tests/engine/benchmarks.test.ts`:

1. **Benchmark 1: Filter Throughput**
   - 10,000 steps of `OneEuroFilter.filter()`.
   - Budget: $> 1,000,000\text{ steps/second}$ ($< 0.001\text{ ms/step}$).
2. **Benchmark 2: Target Arbitration Scale**
   - 1,000 steps with 10 targets, 50 targets, and 200 targets.
   - Target budgets:
     - 10 targets: $< 0.05\text{ ms/step}$.
     - 50 targets: $< 0.20\text{ ms/step}$.
     - 200 targets: $< 0.80\text{ ms/step}$.
3. **Benchmark 3: Complete End-to-End `step()`**
   - Full pipeline (filter + arbitration + dwell FSM) over a 60-second simulated trace.
   - Budget: Mean execution time $< 0.25\text{ ms/step}$, P99 $< 0.50\text{ ms/step}$.

---

## 4. Acceptance Criteria

- All microbenchmarks execute within defined time budgets.
- Memory profile shows a flat heap profile during 10,000 continuous steps.

---

## 5. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing performance optimizations and benchmarks for packages/engine/.

Read packages/engine/plans/performance-and-benchmarks.md and docs/contracts.md.

ALLOWED EDITS:
- packages/engine/src/**
- tests/engine/**

TASK:
1. Implement spatial broadphase rejection in packages/engine/src/targeting/arbitrator.ts.
2. Implement tests/engine/benchmark.test.ts measuring step() throughput across 10, 50, and 200 targets.
3. Validate that P99 step latency is < 0.5ms.

Report benchmark results.
```
