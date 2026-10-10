# Target Acquisition Detailed Plan (`packages/engine/plans/target-acquisition.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document details target candidate selection, ambiguity resolution, and magnetic attraction assistance. The objective is to assist users in acquiring small or densely packed clickable controls without trapping the cursor or creating unpredictable jumps.

### Crucial Architectural Invariant
Target selection and dwell timing are driven by **filtered pointer coordinates**, NEVER by snapping the cursor to the target center. Artificial cursor snapping creates an irreversible positive feedback loop where the user cannot escape the target. SteadyHand computes candidate acquisition while allowing the virtual pointer to move smoothly according to the filtered user input.

---

## 2. Current Repository State

- Scaffolding exists in `packages/engine/src/targeting/`.
- No targeting implementation currently exists.

---

## 3. Algorithmic Principles & Geometry

### Coordinate System
All coordinates are 2D floating-point numbers in CSS viewport pixels.

### Distance Metric: Shortest Boundary Distance
Given filtered pointer position $P = (x, y)$ and target rectangle $R$ with $(R_x, R_y, R_w, R_h)$:
$$dx = \max(R_x - x, 0, x - (R_x + R_w))$$
$$dy = \max(R_y - y, 0, y - (R_y + R_h))$$
$$d(P, R) = \sqrt{dx^2 + dy^2}$$

### Dynamic Thresholds & Hysteresis
To prevent jitter-induced candidate switching:
- **Capture Radius ($R_{capture}$):** Configured via `AssistanceConfig.target.capture_radius_px` (default $16\text{ px}$, valid range $0\text{–}24\text{ px}$).
- **Hysteresis Extension ($\Delta_{hyst}$):** $+6\text{ px}$.
- **Candidate Retention Rule:**
  If target $T$ is currently the active candidate, it is not dropped until:
  $$d(P, T) > R_{capture} + \Delta_{hyst}$$
  Or unless a competing target $T_{comp}$ is closer by at least $8\text{ px}$.

### Ambiguity Margin & Competing Targets
When targets are closely spaced (e.g., adjacent radio buttons):
1. Identify all eligible targets where $d(P, R) \le R_{capture}$.
2. Sort candidates ascending by distance: $d_1 \le d_2 \le \dots$
3. If $d_1 \le R_{capture}$ and $|d_2 - d_1| < \text{ambiguity\_margin\_px}$ (default $8\text{ px}$):
   - Set `ambiguous = true`.
   - Set `candidateId = null`.
   - Halt dwell timer. The user must move closer to their intended target to resolve the ambiguity.

### Deliberate Escape Vector
If a user wishes to leave a target, hysteresis must not feel sticky:
- If instantaneous speed $v > 600\text{ px/s}$ and velocity vector $\vec{v}$ points away from the center of target $T$ ($\vec{v} \cdot (\vec{P} - \vec{C}_T) > 0$), hysteresis margin $\Delta_{hyst}$ is instantly zeroed.

---

## 4. Implementation Details (`arbitrator.ts`)

```typescript
export class TargetArbitrator {
  private activeCandidateId: string | null = null;

  public arbitrate(
    pointer: Point,
    targets: readonly Target[],
    config: AssistanceConfig['target'],
    speedPxPerSec: number
  ): { candidateId: string | null; ambiguous: boolean } {
    // 1. Filter out disabled or non-interactive targets
    const validTargets = targets.filter(t => t.enabled);

    // 2. Compute distances
    const scored = validTargets.map(t => ({
      target: t,
      dist: distanceToRect(pointer, t.rect),
    }));

    // 3. Determine hysteresis allowance for currently active candidate
    const isEscaping = speedPxPerSec > 600;
    const hyst = isEscaping ? 0 : 6;

    // 4. Find targets within effective radius
    const candidates = scored.filter(s => {
      const maxR = s.target.id === this.activeCandidateId 
        ? config.capture_radius_px + hyst 
        : config.capture_radius_px;
      return s.dist <= maxR;
    }).sort((a, b) => a.dist - b.dist);

    if (candidates.length === 0) {
      this.activeCandidateId = null;
      return { candidateId: null, ambiguous: false };
    }

    if (candidates.length >= 2) {
      const d1 = candidates[0].dist;
      const d2 = candidates[1].dist;
      if (Math.abs(d2 - d1) < config.ambiguity_margin_px) {
        this.activeCandidateId = null;
        return { candidateId: null, ambiguous: true };
      }
    }

    this.activeCandidateId = candidates[0].target.id;
    return { candidateId: this.activeCandidateId, ambiguous: false };
  }
}
```

---

## 5. Failure Handling

- **Overlapping Targets (Modals / Menus):** If two targets overlap in the same 2D area ($d_1 = 0, d_2 = 0$), ambiguity arbitration marks `ambiguous = true`. (Person 3 filters occluded targets before passing them to the engine using `document.elementFromPoint`).
- **Dynamic Removal:** If active candidate ID disappears from the target list on the next tick, candidate state resets immediately.

---

## 6. Acceptance Criteria

- Point inside target ($d = 0$) selects that target with zero ambiguity.
- Equidistant point between two adjacent buttons rejects both as ambiguous.
- High-speed exit motion escapes target without sticky drag.

---

## 7. Team Handoff

- **Receiver:** `packages/engine/src/engine.ts`.
- **Exports:** `TargetArbitrator`, `distanceToRect`.

---

## 8. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing target acquisition in packages/engine/src/targeting/.

Read packages/engine/plans/target-acquisition.md and docs/contracts.md.

ALLOWED EDITS:
- packages/engine/src/targeting/**
- tests/engine/**

TASK:
1. Implement packages/engine/src/targeting/distance.ts computing point-to-rect Euclidean distance.
2. Implement packages/engine/src/targeting/arbitrator.ts implementing TargetArbitrator with capture radius, hysteresis, ambiguity rejection, and deliberate escape logic.
3. Implement tests/engine/targeting.test.ts checking:
   - Distance formulas for interior, edges, corners.
   - Ambiguity margin triggering on close targets.
   - Hysteresis behavior maintaining candidate.
   - Speed-based escape resetting hysteresis.

Verify all tests pass.
```
