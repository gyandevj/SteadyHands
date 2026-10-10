# Controlled Demonstration Pages Master Plan (`apps/fixtures/PLAN.md`)

**Owner:** Person 4 (Dedeepya)  
**Consumer:** Person 3 (Extension testing), Kripa (Demo walkthrough), Evaluators  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This subsystem provides independent, realistic HTML test pages to demonstrate and benchmark SteadyHand. 

### Core Architectural Mandate: No Extension-Specific Hooks
To prove that SteadyHand works on arbitrary, uninstrumented third-party websites:
- Fixture pages contain **ZERO** SteadyHand-specific classes (`.steadyhand-*`), global registries, data attributes (`data-target-id`), or custom events.
- Elements use standard semantic HTML tags (`<input>`, `<textarea>`, `<button>`, `<label>`).
- Person 3's extension must discover interactive controls purely through standard DOM reflection (`document.querySelectorAll`, `getBoundingClientRect`, `elementFromPoint`).

---

## 2. Current Repository State

- `apps/fixtures/README.md` exists describing the fixture requirements.
- No HTML files, stylesheets, or dev server configurations exist yet.

---

## 3. Proposed File Structure

```text
apps/fixtures/
├── README.md
├── PLAN.md                                    # This master plan
├── package.json                               # Lightweight static dev server
├── vite.config.ts                             # Local Vite server config
├── plans/                                     # Focused architectural specifications
│   ├── supported-form-controls.md
│   ├── target-acquisition-tasks.md
│   ├── dynamic-page-and-cancellation-cases.md
│   └── experiment-controls-and-metrics.md
├── index.html                                 # Navigation hub
├── registration.html                          # Layout 1: Service Registration Form
├── enrollment.html                            # Layout 2: Course Enrollment Form
├── tasks.html                                 # Discrete target acquisition benchmark tasks
├── dynamic.html                               # Layout shift, modal occlusion, dynamic removal
├── styles/
│   └── fixture.css                            # Clean semantic CSS (modern typography, neutral layout)
└── scripts/
    └── task_harness.js                        # Independent metric timer & trial counter
```

---

## 4. Fixture Pages Breakdown

| Page | Layout & Styling | Controls Tested | Key Scenarios |
| :--- | :--- | :--- | :--- |
| `registration.html` | High-contrast modern SaaS card layout. | Text inputs, password, checkboxes, radio group, buttons. | Focusing inputs, dwell-toggling checkboxes, associated `<label>` behavior. |
| `enrollment.html` | Multi-column university portal layout. | Large textareas, clustered checkboxes, native select dropdown. | Small target density, native fallback controls. |
| `tasks.html` | Fitts-style discrete target grid. | Standardized buttons ($24\text{ px}, 48\text{ px}, 96\text{ px}$) at fixed distances. | Quantitative Fitts-law throughput and acquisition timing benchmarks. |
| `dynamic.html` | Dynamic dashboard with simulated async updates. | Dynamic elements inserted/removed, modal dialogs, scrolling. | Dwell cancellation upon layout reflow, element removal mid-hover, modal occlusion rejection. |

---

## 5. Independent Measurement Harness (`task_harness.js`)

Benchmark evaluation must be independent of the assistive technology being evaluated:
- The fixture page records trial start, completion timestamp, error count (mis-clicks outside targets), and cancellation count.
- The harness logs metrics locally to `localStorage` or displays a readable summary table at the bottom of the page.
- The harness NEVER passes target coordinates or coordinates hints to the extension.

---

## 6. Acceptance Criteria

- Pages run on a local HTTP origin (`http://127.0.0.1:5173/`).
- Person 3’s extension injects cleanly and operates across all four pages without throwing exceptions.
- Zero occurrences of `steadyhand` in page source code.

---

## 7. Team Handoff

- **Receiver:** Person 3 (Extension), Kripa (Demo lead), Person 4 (Evidence collection).
- **URL Endpoint:** `http://127.0.0.1:5173/registration.html`.

---

## 8. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing independent test fixtures in apps/fixtures/.

Read apps/fixtures/PLAN.md and apps/fixtures/plans/supported-form-controls.md.

ALLOWED EDITS:
- apps/fixtures/**

TASK:
1. Implement apps/fixtures/package.json and vite.config.ts to serve static HTML.
2. Implement styles/fixture.css with clean, semantic, neutral styling.
3. Implement registration.html (Layout 1) and enrollment.html (Layout 2) using standard HTML5 controls.
4. Implement tasks.html with standardized Fitts acquisition targets and task_harness.js.
5. Implement dynamic.html with layout shift and modal occlusion cases.
6. Verify that no SteadyHand-specific scripts or classes exist in any fixture HTML.
```
