# Full project plan

## 1. The final concept

SteadyHand is a **Chrome extension first**, a **dashboard second**, and an **optional motion-sensing peripheral third**.

The extension observes mouse input, renders a stabilized virtual pointer, discovers supported webpage controls, offers bounded target assistance, and performs cancellable dwell for eligible actions. It operates on pages the team did not instrument with a SteadyHand-specific registry. The dashboard offers settings, calibration, device status, signal visualization, and measured results. The UNO Q and Grove sensor supply timestamped acceleration through a local service.

The mouse supplies pointer coordinates. Sensor analysis can offer an assistance preset for the user to try. It does not automatically infer intended targets, diagnose tremor disorders, or submit forms.

## 2. What should make it stand out

1. **An extension that works on more than its own demo app.** Two pages use different layouts and ordinary HTML controls. Both use the same discovery and interaction engine.
2. **Hardware you can inspect.** Live samples, quality gates, sensor identity, and disconnect behavior are visible.
3. **An assistance engine with real invariants.** At-most-once selection, explicit cancellation, ambiguity rejection, layout invalidation, and safe fallback.
4. **User agency.** Manual assistance works without hardware. Recommendations require acceptance. Disable is always available.
5. **Evidence over theater.** Measured task attempts, filter response, sensor quality, and source labels replace predetermined improvement numbers.

Spend engineering effort on these five outcomes. A polished landing page alone is insufficient, and unvalidated clinical claims would weaken the project.

## 3. Four-person sector split

| Person | Sector | Owns | Does not need to wait for | First deliverable |
| --- | --- | --- | --- | --- |
| **Dev** | Backend + hardware | API, local WebSocket, adapters, UNO Q sampling, optional motor, contracts, release wiring | Finished UI or complete signal algorithm | Mock service emitting canonical frames plus a hardware smoke test |
| **Kripa** | Frontend + UI/UX | Dashboard, popup, options page, shared visual components, onboarding, settings, result screens | Live sensor or real extension transport | Clickable setup and assistance UI using mock adapters |
| **Person 3** | Extension + browser integration | Manifest/build, worker, content script, DOM discovery, geometry, overlay lifecycle, activation, reconnect routing | Hardware or polished UI | Load-unpacked extension enabling an overlay on two fixture pages |
| **Person 4** | Algorithms + signal processing | TS pointer filters and dwell state machine, Python sensor analysis, fixtures, algorithm tests, benchmark | Physical board or full dashboard | Engine module and deterministic fixture generator with defined outputs |

### Dev's boundaries

Dev edits `services/bridge/**`, `firmware/unoq/**`, `packages/contracts/**`, `scripts/**`, root workspace files, and deployment instructions. Dev imports `analysis/` as a library written by Person 4. Dev does not rewrite the extension engine or Kripa's UI. Person 4 should pair with Dev on numerical integration so hardware bring-up does not also become algorithm implementation.

### Kripa's boundaries

Kripa edits `apps/dashboard/**`, `packages/ui/**`, `design/**`, `apps/extension/src/popup/**`, and `apps/extension/src/options/**`. Person 3 owns extension HTML entry files, manifest, and bundling. Agree on component mount exports in hour 1. Kripa supplies visual components; Person 3 owns the imperative pointer/target overlay and loads Kripa's stylesheet tokens.

### Person 3's boundaries

Person 3 edits the rest of `apps/extension/**` and `tests/extension/**`. They import `packages/engine` and `packages/contracts`, and mount Kripa's UI. They own the browser event boundary, element discovery, dynamic geometry, and lifecycle cleanup. They do not fork the filter or dwell algorithm into the content script.

### Person 4's boundaries

Person 4 edits `packages/engine/**`, `analysis/**`, `apps/fixtures/**`, `fixtures/**`, `tests/engine/**`, `tests/analysis/**`, and `evidence/**`. They write both the pure pointer engine and the pure sensor analysis. Their packages contain no Chrome API calls or backend server. They own benchmark generation and evidence, with everyone supplying component checks.

For full filenames, see [repository_tree.md](docs/repository_tree.md). An ownership exception should be agreed with that owner before editing. Code review and debugging assistance are welcome across sectors.

## 4. Scope priorities

| Level | Features | Completion gate |
| --- | --- | --- |
| **P0: product** | Unpacked MV3 extension; user-enabled top-frame support; virtual pointer; filter; unique-target selection; dwell focus/toggles; Escape cancel; software-only operation | Same extension works on two ordinary form layouts |
| **P0: integration** | Mock backend, dashboard settings, contracts, device/source state, reload recovery | UI and extension use the same validated configuration |
| **P0: hardware** | Identify sensor; verified wiring; timestamped live stream; quality-aware motion display | Live samples reach dashboard and extension state without controlling clicks |
| **P0: evidence** | Seeded stress test, algorithm checks, compatibility failures, restartable demo | No fabricated timings or medical inference |
| **P1** | User-approved sensor recommendation, optional selection haptic, session export, second theme, polish | Core remains stable when these are disabled |
| **P2** | Per-site persisted permission, iframe/open-shadow support, custom widgets, optional Gemini explanations | Add only after P0 and meaningful compatibility checks |

General button dwell is disabled in P0. Focusing inputs and changing ordinary checkboxes/radios provide useful dwell actions with controllable semantics. Pointer-assisted physical clicks can support explicitly eligible buttons. Submit controls, payment, destructive actions, file pickers, and unknown widget behavior stay on the normal user interaction path. Do not claim compatibility with every site.

## 5. Architecture to freeze

- TypeScript workspace: React/Vite dashboard and extension UI; plain TypeScript content runtime; pure TS engine and contracts.
- Python workspace: FastAPI service; pure NumPy analysis library; pytest for meaningful algorithm/service checks.
- Arduino MCU sketch: sensor acquisition and optional bounded motor commands through the verified UNO Q bridge.
- Extension worker owns the backend WebSocket. Content scripts receive derived frames and locally control pointer timing.
- Start with Chrome 116+ as the minimum for the documented service-worker WebSocket support; test on the actual installed version.
- Use packaged extension assets. No remote JavaScript or development-server imports in the unpacked demo build.
- The preferred endpoint is `ws://127.0.0.1:8765/v1/stream`, reached from the worker, not a random webpage. Dev proves the board-to-laptop route early.
- No accounts, remote database, cloud inference, operating-system mouse driver, or Web Store publication is required.

See [architecture.md](docs/architecture.md) for network alternatives and lifecycle decisions.

## 6. Integration order

**Slice A: software product.** Person 3 injects the content script into a fixture. Person 4's filter and dwell module controls it. Kripa's popup changes settings. No service or board is necessary.

**Slice B: mock connected product.** Dev's service streams labeled synthetic frames to the worker and dashboard. Device state and recommendations display correctly. Cursor filtering still runs locally.

**Slice C: live hardware.** Replace the backend adapter, not the UI or engine. Sensor data enters the same schema. Verify sample quality, stale state, and reconnect.

**Slice D: optional haptics and evidence.** A successful eligible selection requests one short cue. Commands are deduplicated and samples are blanked during pulse/settling. Record an actual benchmark and restart the complete system.

## 7. First hour

| Person | Actions |
| --- | --- |
| Dev | Create workspace boundaries; freeze schemas with everyone; start mock `/health` and WS; identify sensor; test one MCU/Linux bridge round trip |
| Kripa | Build shared design tokens; settings and onboarding mock; define `mountPopup`/`mountOptions`; draft dashboard states |
| Person 3 | Create minimal MV3 build; enable button; idempotent injection; Shadow DOM overlay; prove extension UI entry points |
| Person 4 | Create filter/dwell module interfaces; generated sensor fixtures; two HTML forms with no extension-specific hooks |

At minute 60, everyone can run an independent fixture and explain their imports. If setup stalls, reduce tooling rather than introducing another framework.

## 8. 24-hour schedule

This is a planning assumption. Move feature freeze earlier if your deadline is sooner.

| Time | Dev | Kripa | Person 3 | Person 4 | Joint gate |
| --- | --- | --- | --- | --- | --- |
| 0–1 h | Contracts, mock service, hardware identity | Tokens, UI shells | Manifest, worker, injection | Pure interfaces, fixtures | Shared contracts and folder boundaries fixed |
| 1–4 h | Mock stream; board sample proof | Popup/options and dashboard mocks | Discovery, geometry, local engine wiring | Filters, dwell FSM, synthetic fixtures | Extension selects an ordinary control |
| 4–8 h | Live bridge adapter; timestamp/counters | Real transport hooks and calibration UX | Activation/cancellation; reconnect | Sensor quality and spectrum | Software slice works; at least one live batch exists |
| 8–12 h | Live endpoint and device health | Recommendation and results screens | Two-page compatibility, cleanup | Motion features, evidence harness | Live status plus software-only fallback |
| 12–16 h | Optional motor; integrate blanking | UI/keyboard polish | Worker restart and edge-case fixes | Blanking tests, filter comparisons | P0 acceptance checks pass |
| 16–20 h | Launch script and documented wiring | Demo flow polish | Production extension package | Measured task summary and exports | Feature freeze; no new architecture |
| 20–24 h | Hardware and system rehearsal | UI demonstration | Browser demonstration | Evidence and pitch questions | Two full runs after restart and backup video |

Hold ten-minute integration checkpoints at hours 1, 4, 8, 12, and 16. Merge small coherent changes. Keep `main` runnable.

## 9. Fallbacks without abandoning the extension

| Problem | Response |
| --- | --- |
| UNO Q bridge not stable by hour 6 | Dev and Person 4 pair; other two finish extension. Keep clearly labeled mock/recorded mode available |
| Sensor resolution too coarse | Show detectable deliberate motion and its limits; retain manual assistance |
| Backend unavailable | Extension still filters and dwells locally; device badge says unavailable |
| General button activation unreliable | Keep focus/toggle dwell and physical native clicks; document unsupported controls |
| Network endpoint blocked | Test loopback route or configured local origin; keep software demo and labeled recording |
| No motor parts | Omit haptics; visual selection confirmation remains |
| Fewer than 12 hours | One dashboard flow, two basic fixture pages, one filter, deterministic dwell, sensor visualization if available |

## 10. Release completion criteria

- The same extension, with no per-page SteadyHand hooks, works on two independent form layouts.
- Disable/Escape cleans up overlay, styles, listeners, and active dwell.
- One selection yields at most one activation.
- Native typing, keyboard access, and unsupported control interactions remain available.
- Tab hiding, geometry changes, and fault transitions cancel pending dwell.
- Worker suspension/restart and device restart cannot replay actions or haptic commands.
- Live, recorded, synthetic, and unavailable states are always clear.
- Sensor loss does not remove software assistance.
- Exact sensor and actual wiring are recorded; haptics are described as optional if not built.
- Measured results include trial counts and failures.
- A teammate can launch the project from the instructions.

## 11. Prompt usage

Read [prompts/global.md](prompts/global.md), then your `teams/` file. Use one stage at a time. Give the coding model the actual repository, not just a copied tree. Tell it to read contracts before changing interfaces, stay within ownership, and report exact modified files, executed checks, and blockers. Use [prompts/integration.md](prompts/integration.md) only after the first independent components exist.
