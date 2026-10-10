# Person 4: algorithms, signal processing, and evidence

## Ownership

Own packages/engine, analysis, apps/fixtures, fixtures, tests/engine, tests/analysis, and evidence. Two languages are intentional: TypeScript runs pointer logic locally; Python analyzes acceleration inside Dev's service.

Deliver narrow pure APIs early. Do not implement a server, Chrome API wrapper, or Kripa's screens.

## Kickoff prompt

~~~text
Implement Person 4's numerical/evidence sector. Read AGENTS.md, plan.md, docs/contracts.md, docs/hardware.md, docs/testing.md, and engine/analysis/fixture READMEs. Only edit my owned folders.

Build a pure TypeScript InteractionEngine with the agreed interfaces. Inputs are mouse coordinates in CSS pixels, monotonic time, plain target rectangles/eligibility, geometry/config revisions. Outputs are filtered coordinates, candidate, ambiguity, dwell progress, and a unique selection event. No DOM, Chrome, server, or network dependency.

Implement time-aware exponential smoothing first and One Euro second using the published algorithm and units. Use actual dt, finite input validation, reset after long pauses, and bounded settings. Low cutoff reduces jitter but adds lag; speed adaptation is a tuning choice, not universal superiority. Return raw virtual coordinates when the agreed developer test bypass is active.

Target selection uses bounded capture distance, clear unique-winner arbitration, ambiguity rejection, and hysteresis without trapping deliberate exit. Dwell uses Idle/Candidate/Dwelling/Activated/Rearm state, monotonic timing, at-most-once selection, explicit cancel, leaving before rearm, and bounded cooldown. A change in geometry/config revision cancels. Content must be able to step while stationary. Engine proposes a selection; Person 3 must revalidate/dispatch the actual DOM action.

Build pure Python steadyhand_signal analysis with typed models and no service/device I/O. Validate unique monotonic timestamps, fresh rate, finite samples, loss, saturation, and haptic overlap. Analyze accepted short gaps only; never fill a long outage with zeros and call it continuous data. Preserve per-axis signal and units.

Start with a 2-second window and 250 ms updates using actual 100/120 Hz configuration. Detrend each axis, Hann-window, compute correctly normalized one-sided PSD, and sum axis PSDs. Do not analyze only acceleration magnitude, which can distort periodic content. Exploratory 3-12 Hz features are engineering measurements, not a diagnostic band.

Return band RMS, power ratio, peak, concentration, quality/reasons, and a cautious motion state. At low energy, frequency is unavailable. Use stationary baseline/noise/quantization, persistent good evidence, and hysteresis. Invalid data returns unknown and null recommendation. Document provisional thresholds and tune them against captures; no clinical accuracy claim.

Provide stationary calibration with measurable-quality rejection. Mount, range, ODR, or boot changes invalidate it. Recommended assistance is advisory; acceleration amplitude does not automatically become a pixel filter setting. Haptics mark pulse/settling windows invalid until a fresh clean window exists.

Create two independent ordinary HTML forms and edge-case pages with no SteadyHand-specific target hooks. Fixture counters may measure results but cannot supply private target coordinates to the extension.

Build seeded pointer/sensor fixtures and meaningful tests, then actual evidence. Raw, exponential, and One Euro comparisons use identical paths/targets/seeds. Report jitter reduction alongside lag, failures, and settings. Participant task results use actual counts, timeouts, and learning-order context. Never manufacture a successful improvement, intended human trajectory, or medical benefit.

Implement only my next stage. Return APIs, fixtures, numerical assumptions, actual checks, plots/results produced, unresolved sensitivity/compatibility issues, and handoff to Dev/Person 3.
~~~

## Stage 1: pure engine and forms

~~~text
Implement exponential filter, candidate arbitration, cancellable dwell, engine interface, and two ordinary HTML forms. Add focused tests for variable dt, ambiguity, cancel, exactly once, rearm, and geometry/config revision. No DOM inside engine. Acceptance: Person 3 can import one module and run it against a fixture; repeated stationary steps advance dwell; large pauses do not instantly activate.
~~~

## Stage 2: One Euro and pointer evidence

~~~text
Implement the published One Euro algorithm, including derivative filtering, unit-aware beta, finite/reset behavior. Generate a known clean path with seeded jitter and slow/fast movement. Compare raw/exponential/One Euro using identical inputs. Report actual deviation/lag tradeoffs and selected parameters. Do not turn one favorable trace into a universal claim. Export fixture and measured summary for the dashboard.
~~~

## Stage 3: sensor analysis

~~~text
Implement typed quality, resampling, stationary calibration, normalized axis PSD, features, and state persistence. Generate quiet, 5 Hz, 8 Hz, mixed-axis, gaps, duplicate time, saturation, reboot, and haptic-overlap cases. Acceptance: known peaks within one FFT bin on good windows; invalid windows never recommend; quantization/noise limits remain visible. Hand Dev importable analyze_window and calibrate_stationary with exact units/shapes.
~~~

## Stage 4: live calibration and artifacts

~~~text
Use Dev's actual model/rate/mount captures to check scale, freshness, baseline, intentional movement, desk taps, rotation, cable tugs, and periodic false positives. If a motor exists, validate pulse/settling rejection and clean-window recovery. Tune only declared engineering parameters and record why. If subtle motion is below sensor resolution, report it instead of smoothing it into invented sensitivity.
~~~

## Stage 5: evidence and release

~~~text
Run the defined task benchmark with fixed geometry and actual attempts. Alternate mode order, preserve timeouts/errors, and report participant/trial counts. Export source-labeled plots, compatibility results, and a concise summary. Separate generated stress tests from deliberate hardware motion and human feedback. Acceptance: evidence can be reproduced, no entered values are saved, and no unrun check appears as passed.
~~~

## Handoffs

Person 3 receives engine exports, settings assumptions, and deterministic target/time fixtures. Dev receives installable Python analysis and recorded-data expectations. Kripa receives measured fields, units, source, null/invalid states, and graphs based on real data. Each should be usable without reading your private coding chat.
