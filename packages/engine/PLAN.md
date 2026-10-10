# Pointer Interaction Engine Master Plan (`packages/engine/PLAN.md`)

**Owner:** Person 4 (Dedeepya)  
**Package:** `@steadyhand/engine`  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

The pointer interaction engine is a reusable, pure TypeScript library that transforms raw user mouse coordinates into stabilized, target-assisted, and dwell-activated interactions. 

### Core Responsibilities
- **Signal Filtering:** Attenuating high-frequency hand tremors and mouse sensor jitter using time-aware filters (Exponential and One Euro).
- **Target Assistance:** Attracting the virtual pointer toward eligible interactive UI elements using bounded Euclidean distance, hysteresis, and ambiguity arbitration.
- **Dwell State Machine:** Managing dwell hover activation for eligible controls, ensuring at-most-once triggering, explicit rearming, and immediate cancellation upon layout shifts or deliberate user departure.

### Architectural Boundaries
- **Strictly Pure Logic:** Zero dependencies on DOM nodes (`HTMLElement`, `document`, `window`), Chrome Extension APIs (`chrome.*`), React, Node.js networking, or Arduino hardware drivers.
- **Integration Boundary:** Person 3 (Extension) owns browser event listening, DOM query/geometry calculation, DOM dispatch, and visual overlay rendering. Person 4 (Dedeepya) owns the mathematical transformations and state machine transitions.

---

## 2. Current Repository State

- `packages/engine/README.md` exists with high-level constraints.
- `packages/engine/src/` contains empty directory scaffolds (`dwell/`, `filters/`, `targeting/`).
- No build configuration (`package.json`, `tsconfig.json`) or source code files exist yet.

---

## 3. Proposed File Structure

```text
packages/engine/
├── README.md
├── PLAN.md                                    # This master plan
├── package.json                               # Workspace module configuration
├── tsconfig.json                              # Strict ES2022 / TS configuration
├── plans/                                     # Focused architectural specifications
│   ├── public-api-and-integration.md
│   ├── pointer-filtering.md
│   ├── target-acquisition.md
│   ├── dwell-state-machine.md
│   ├── calibration-and-presets.md
│   ├── timing-reset-and-failure-handling.md
│   └── performance-and-benchmarks.md
└── src/
    ├── PLAN.md                                # Source layout plan
    ├── index.ts                               # Public package exports
    ├── types.ts                               # Canonical pure TS types
    ├── engine.ts                              # InteractionEngine facade implementation
    ├── filters/
    │   ├── PLAN.md
    │   ├── types.ts                           # IPointerFilter interface
    │   ├── passthrough.ts                     # Raw virtual passthrough (technical stress test)
    │   ├── exponential.ts                     # Variable-dt exponential low-pass filter
    │   └── one_euro.ts                        # Speed-adaptive One Euro filter
    ├── targeting/
    │   ├── PLAN.md
    │   ├── types.ts                           # Target geometry models
    │   ├── distance.ts                        # Euclidean distance calculations to rectangles
    │   └── arbitrator.ts                      # Ambiguity rejection, hysteresis, winner selection
    └── dwell/
        ├── PLAN.md
        ├── types.ts                           # Dwell states and transitions
        └── state_machine.ts                   # Monotonic cancellable dwell state machine
```

---

## 4. Interfaces and Data

Conforming strictly to `docs/contracts.md`:

### Core Data Models
```typescript
export interface Point {
  readonly x: number;       // CSS pixels relative to viewport
  readonly y: number;       // CSS pixels relative to viewport
  readonly tMs: number;     // Monotonic millisecond timestamp (performance.now())
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Target {
  readonly id: string;
  readonly rect: Rect;
  readonly kind: 'focus' | 'toggle' | 'button';
  readonly enabled: boolean;
  readonly dwellAllowed: boolean;
}

export interface AssistanceConfig {
  readonly v: 1;
  readonly revision: number;
  readonly mode: 'native' | 'stabilized' | 'raw_virtual';
  readonly filter: {
    readonly kind: 'exponential' | 'one_euro';
    readonly min_cutoff_hz: number;           // 0.1 to 20.0 Hz
    readonly beta?: number;                   // 0.0 to 1.0 (One Euro speed coefficient)
    readonly derivative_cutoff_hz?: number;   // Default 1.0 Hz
  };
  readonly target: {
    readonly capture_radius_px: number;       // 0 to 24 px
    readonly ambiguity_margin_px: number;     // e.g. 8 px
  };
  readonly dwell: {
    readonly enabled: boolean;
    readonly duration_ms: number;             // 600 to 1500 ms
    readonly rearm_ms: number;                // 200 to 1000 ms
  };
  readonly haptics_enabled: boolean;
  readonly show_raw_pointer: boolean;
}

export interface EngineInput {
  readonly raw: Point;
  readonly targets: readonly Target[];
  readonly geometryRevision: number;
  readonly configRevision: number;
}

export interface EngineOutput {
  readonly pointer: Point;                    // Filtered and assisted virtual pointer coordinates
  readonly candidateId: string | null;        // Active target candidate (if acquired and non-ambiguous)
  readonly ambiguous: boolean;               // True if multiple targets compete within ambiguity margin
  readonly dwellProgress: number;             // Float 0.0 to 1.0
  readonly selection: {
    readonly id: string;                      // Unique selection event ID
    readonly targetId: string;                // Target ID to activate
  } | null;
}

export interface InteractionEngine {
  step(input: EngineInput): EngineOutput;
  cancel(reason: string): void;
  reset(point: Point): void;
  applyConfig(config: AssistanceConfig): void;
}
```

---

## 5. Implementation Sequence

### Stage 1: Core Foundation (P0)
1. Initialize package metadata (`package.json`, `tsconfig.json`) without external runtime dependencies.
2. Define canonical domain types in `src/types.ts`.
3. Implement `ExponentialFilter` with discrete time-aware $\alpha$ computation.
4. Implement `TargetArbitrator` with geometric distance and hysteresis.
5. Implement `DwellStateMachine` with monotonic timer advancement and exactly-once selection semantics.
6. Assemble `InteractionEngine` facade in `src/engine.ts`.
7. Write unit test suite in `tests/engine/` validating invariants.

### Stage 2: Adaptive Filtering (P1)
1. Implement `OneEuroFilter` according to Casiez et al. (2012) with filtered velocity estimation.
2. Implement `PassthroughFilter` for the developer test bypass (`raw_virtual`).
3. Add configuration switching and filter reset semantics.

### Stage 3: Calibration & Performance Optimization (P1/P2)
1. Add preset definitions (`Light`, `Steady`, `Custom`) and mapping helpers.
2. Profile execution speed to ensure `step()` executes in $<0.2\text{ ms}$.

---

## 6. Failure Handling

1. **Nonfinite Coordinates:** If `x`, `y`, or `tMs` is `NaN` or `Infinity`, reject the sample, retain the previous filtered point, and log a warning.
2. **Clock Jumps or Pauses ($\Delta t > 1000\text{ ms}$):** Reset filter state to the new raw coordinate to prevent rubber-banding or delayed exponential chasing.
3. **Negative or Duplicate $\Delta t$ ($\Delta t \le 0$):** Set $\Delta t = 0\text{ ms}$, do not update filter velocity, retain previous output position.
4. **Target Layout Shift / DOM Change:** Triggered via `geometryRevision` mismatch. Instantly cancels dwell in progress, resets progress to `0.0`, and clears active selection.
5. **Ambiguous Overlapping Targets:** If two valid targets are within `ambiguity_margin_px`, `candidateId` becomes `null`, `ambiguous` becomes `true`, and dwell timer halts.

---

## 7. Acceptance Criteria

- **Automated Tests:**
  - 100% pass rate on `tests/engine/` test suite.
  - Exactly one selection event dispatched per continuous dwell hover.
  - Leaving target area before completion clears dwell progress to 0.0.
  - Hovering after activation does not trigger a second selection event until target exit and rearm timeout elapse.
  - Incrementing `geometryRevision` cancels dwell immediately.
- **Performance:**
  - `InteractionEngine.step()` executes in $< 0.5\text{ ms}$ for a list of 50 targets.
  - Zero memory allocation in steady-state operation (reusable state objects).

---

## 8. Team Handoff

- **Receiver:** Person 3 (Extension Content Script).
- **Handoff Artifacts:** Compiled package `@steadyhand/engine` exporting `InteractionEngine`, `AssistanceConfig`, `Point`, `Target`, `EngineInput`, `EngineOutput`.
- **Consumer Verification:** Person 3 imports `InteractionEngine`, feeds viewport mouse coordinates and `getBoundingClientRect()` targets into `step()`, and renders the virtual pointer overlay.

---

## 9. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing the pure TypeScript pointer engine for SteadyHand.

Read packages/engine/PLAN.md, packages/engine/plans/public-api-and-integration.md, packages/engine/plans/pointer-filtering.md, packages/engine/plans/target-acquisition.md, and packages/engine/plans/dwell-state-machine.md.

ALLOWED EDITS:
- packages/engine/**
- tests/engine/**

FORBIDDEN EDITS:
- packages/contracts/**, apps/**, services/**, firmware/**, root manifests.

TASK:
1. Create packages/engine/package.json and tsconfig.json.
2. Implement packages/engine/src/types.ts declaring Point, Rect, Target, AssistanceConfig, EngineInput, EngineOutput, and InteractionEngine.
3. Implement packages/engine/src/filters/exponential.ts with time-aware smoothing: alpha = 1 - Math.exp(-2 * Math.PI * cutoff * dt).
4. Implement packages/engine/src/targeting/arbitrator.ts with Euclidean distance to rectangle bounds, capture radius, ambiguity rejection, and hysteresis.
5. Implement packages/engine/src/dwell/state_machine.ts with states Idle, CandidateAcquired, Dwelling, Activated, RearmPending, monotonic progress, cancel on revision changes, and leave-to-rearm logic.
6. Implement packages/engine/src/engine.ts combining these modules into InteractionEngine.
7. Implement comprehensive unit tests in tests/engine/ checking:
   - Variable dt smoothing.
   - Ambiguous target rejection.
   - At-most-once selection dispatch.
   - Geometry revision cancellation.

Verify that all tests pass. Provide a concise summary of changes and the exported API for Person 3.
```
