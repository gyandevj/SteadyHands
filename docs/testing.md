# Acceptance, compatibility, and evidence

**Coordinator: Person 4.** Each owner verifies their component. This is a targeted risk checklist, not a demand for hundreds of generated tests.

## 1. Essential checks

| Check | Owner | Pass evidence |
| --- | --- | --- |
| Extension loads from packaged files | Person 3 | Clean load-unpacked build; no dev server executable dependency |
| Two layouts | Person 3/4 | Same injected bundle discovers controls without per-page hooks |
| Filter timing | Person 4 | Finite output, variable dt, reset after pauses; measured synthetic jitter/lag |
| Dwell exactly once | Person 4/3 | Long hover dispatches once; leaving rearms; cancel prevents action |
| Ambiguity | Person 4/3 | Competing targets yield no activation |
| DOM revalidation | Person 3 | Removed, disabled, moved, hidden, or occluded target cannot activate |
| Input compatibility | Person 3 | Normal typing, keyboard, scrolling, and unsupported control path preserved |
| Duplicate click prevention | Person 3 | One physical assisted click causes one semantic activation |
| Cleanup | Person 3 | Disable/re-enable leaves no duplicate listeners, styles, overlays, timers |
| UI state honesty | Kripa | Mock, live, recorded, unavailable, warming, and rejected states are distinct |
| Schema agreement | Dev | TS and Python both validate canonical valid and invalid examples |
| Live acquisition | Dev/4 | Actual unique rate, counters, scale, disconnect and reboot captured |
| Motion evidence | Person 4 | Known synthetic peak recovered within one FFT bin; invalid windows rejected |
| Worker/backend loss | Person 3/Dev | Local assistance survives; one pending-dwell cancel; no command replay |
| Optional motor | Dev/4 | Bounded pulse, dedup, blanking, clean-window recovery |
| Fresh restart | All | Another teammate follows launch steps successfully |

## 2. Web compatibility matrix

| Case | P0 behavior |
| --- | --- |
| Top-frame text input / textarea | Assisted focus; normal typing |
| Ordinary checkbox / radio | Cancellable dwell toggle; label associated with control, no double label activation |
| Enabled ordinary `button type=button` | Pointer-assisted physical click when policy permits; no default dwell |
| Submit button / implicit-submit button | Native review/confirmation interaction; never automatic dwell submission |
| Native select and file input | Preserve native interaction; no promise that synthetic actions open trusted pickers |
| Dynamic inserted/removed controls | Debounced rescan, geometry revision, cancellation before rearming |
| Modal or overlap | Occluded target rejected using actual page hit testing |
| SPA route / changed document | Re-evaluate targets and permission/lifecycle |
| Iframe, closed shadow root, canvas widget | Explicit unsupported/fallback behavior in P0 |
| Internal Chrome page | Assistance unavailable with clear status |

Open-shadow/iframe support is additional work with new coordinate and permission cases. Do not silently advertise it because the root page looks correct.

## 3. Deterministic technical tests

Generate a clean intentional pointer trajectory and seeded injected jitter. Keep the clean path only for the synthetic experiment so true error and lag can be measured. Compare raw, exponential, and One Euro outputs with identical target geometry, trace, and seed. Include slow aiming and fast intentional motion, not just one favorable trace.

Generated sensor fixtures include quiet, 5 Hz, 8 Hz, mixed axes, gaps, duplicate time, saturation, reboot, and motor-overlap cases. A 2-second window has nominal 0.5 Hz FFT spacing. Zero-padding does not improve physical resolution.

Real captured deliberate rhythmic movement shows the sensor pipeline. It is not a simulated disease test. Recorded data must retain source and device metadata during playback.

## 4. Task measurements

Run the same mock form task under native, stabilized, and stabilized-plus-dwell modes. Keep target sizes fixed for that comparison. If demonstrating larger targets too, report that intervention separately.

Measure completion, time to completion, timeout, wrong activations/corrections, dwell cancellations, and a short perceived-control comment. Alternate mode order and repeat a few trials to expose learning. Report actual participant and trial counts. Teammates are convenience participants, not a clinical population.

Choose timeout duration before trials. A timed-out attempt stays a timeout; do not assign a successful completion time or preload numbers such as “45 seconds vs gave up.” The results screen starts empty.

Hardware metrics: actual fresh rate, valid-window fraction, gaps, loss counters, and source. Local processing time and filter lag are distinct. MCU, service, and browser clocks are different; do not subtract them for an end-to-end latency claim without alignment. Use separate per-clock measurements or external instrumentation.

## 5. Automation and manual checks

Use Vitest or the existing TS runner for the pure engine and pytest for analysis/service boundaries. Browser checks may use Playwright with a persistent Chromium profile and a loaded unpacked extension where the installed runner supports it. Otherwise perform the same documented checks manually and record that status. Do not report an extension E2E test as passed when only a plain page ran.

Avoid real account submissions. Fixture forms can count activations and render a local completion state. Their counters are benchmark instrumentation, not privileged SteadyHand target hooks.

## 6. Evidence bundle

`evidence/` contains only actual results: a compatibility summary, benchmark summary, plots with units and source labels, wiring photo, and backup video. Obtain permission before retaining identifiable recordings or participant traces. Default to non-personal session IDs and no entered form values.

If no intended-user feedback exists, say so. Do not turn technical traces into medical sensitivity/specificity or broad accessibility claims.
