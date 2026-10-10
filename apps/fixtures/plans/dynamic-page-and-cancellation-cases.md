# Dynamic Page and Cancellation Cases Plan (`apps/fixtures/plans/dynamic-page-and-cancellation-cases.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

Modern web applications are dynamic: Single-Page Applications (SPAs) mount/unmount components asynchronously, floating modals appear unexpectedly, and infinite feeds reflow the layout. This document details `dynamic.html`, a stress-test fixture that exercises SteadyHand's edge-case recovery and cancellation invariants.

---

## 2. Dynamic Scenarios on `dynamic.html`

### Test Case 1: Dynamic Target Removal Mid-Dwell
- **Scenario:** The user hovers over an interactive button with an $800\text{ ms}$ dwell. At $t = 400\text{ ms}$, JavaScript removes the button from the DOM:
  ```javascript
  setTimeout(() => targetBtn.remove(), 400);
  ```
- **Invariant:** The engine detects target removal on the next step; dwell aborts immediately; `progress` drops to 0.0; NO `SelectionEvent` is emitted.

### Test Case 2: Layout Shift & Content Reflow
- **Scenario:** An asynchronous banner expands above the form while the user is dwelling, pushing all targets down by $120\text{ px}$.
- **Invariant:** Person 3’s `MutationObserver` or `ResizeObserver` increments `geometryRevision`. The engine cancels dwell, clears active candidate, and forces the user to re-acquire the target at its new coordinates.

### Test Case 3: Modal Occlusion
- **Scenario:** A modal dialog appears with a semi-transparent backdrop (`z-index: 1000`) covering the underlying form buttons.
- **Invariant:** When Person 3 checks `document.elementFromPoint(px, py)`, the hit test returns the modal backdrop, not the underlying button. Dwell is rejected.

### Test Case 4: Scroll Disappearance
- **Scenario:** The page scrolls so that the target moves outside the viewport bounding box.
- **Invariant:** Target is excluded from `targets` array; dwell cancels.

---

## 3. Fixture Page Structure (`dynamic.html`)

```html
<div class="dynamic-container">
  <h2>Dynamic Edge Cases</h2>
  
  <div class="test-controls">
    <button id="btn-trigger-removal">Test: Remove Button in 400ms</button>
    <button id="btn-trigger-shift">Test: Reflow Layout in 400ms</button>
    <button id="btn-trigger-modal">Test: Show Modal Dialog</button>
  </div>

  <div id="target-zone">
    <button id="fragile-button" class="target-btn">Hover Me (I Might Disappear!)</button>
  </div>

  <div id="modal-backdrop" class="modal hidden">
    <div class="modal-content">
      <h3>Modal Overlay Active</h3>
      <button id="btn-close-modal">Close Modal</button>
    </div>
  </div>
</div>
```

---

## 4. Acceptance Criteria

- Clicking "Test: Remove Button in 400ms" during dwell never triggers an activation.
- Modal occlusion prevents underlying target acquisition.
- Layout reflow instantly resets dwell progress.

---

## 5. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing dynamic test fixtures in apps/fixtures/.

Read apps/fixtures/plans/dynamic-page-and-cancellation-cases.md.

ALLOWED EDITS:
- apps/fixtures/dynamic.html

TASK:
1. Implement dynamic.html with interactive buttons to trigger:
   - Dynamic target removal mid-dwell.
   - Sudden layout shift (reflow).
   - Modal dialog occlusion.
2. Verify cancellation and target safety in browser testing.
```
