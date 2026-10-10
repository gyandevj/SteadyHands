# Person 3: Chrome extension and browser integration

## Ownership

Own apps/extension except src/popup and src/options, plus tests/extension. Kripa supplies UI mounts/components. Person 4 supplies the pure engine. Dev supplies contracts and the optional device service. Your sector is the product's hardest browser boundary.

## Kickoff prompt

~~~text
Implement Person 3's extension sector. Read AGENTS.md, plan.md, docs/architecture.md, docs/contracts.md, docs/testing.md, apps/extension/README.md, and packages/engine/README.md. Edit only my extension paths and tests/extension. Preserve Kripa's popup/options folders and all shared package implementations.

Build an unpacked MV3 extension with packaged assets and Chrome 116+ minimum. Use activeTab, scripting, storage, and the specifically configured backend host. Top-frame-only P0. No all-site auto-injection, debugger, remote code, or invented offscreen reason.

Popup Enable sends an internal message; worker resolves the active tab and injects once. A configured popup means you cannot assume action.onClicked is the enable handler. Mount Kripa's exported UI using adapters. Track per-document injection, not just tab ID. Disable is reversible and performs complete cleanup.

Worker owns validated settings and device WS. Use first-frame auth, snapshot, application keepalive, bounded reconnect backoff, and one connection/timer set. Treat worker state as disposable; recover settings and fresh device state after restart. Do not persist/replay selections, active dwell, or motor requests. Send only derived motion/quality to content. No arbitrary URL or GPIO proxy.

Content script owns local pointer processing. Use clientX/clientY and current getBoundingClientRect geometry in CSS viewport pixels. Render a fixed, pointer-transparent overlay inside your own Shadow DOM host. Call the pure engine using current input and monotonic time. Advance dwell on animation frames even when mouse movement stops. Backend frames never determine pointer cadence.

Discover ordinary top-frame inputs, textarea, checkbox/radio, and policy-eligible buttons. Use stable document-local target IDs, not form values or sensitive labels. Prefer actual associated input over registering its label as another target. Exclude hidden, disabled, disconnected, unsupported, and extension-owned nodes. Recheck occlusion using page hit testing before activation.

Observe relevant DOM/layout changes with debounced work. Ignore your own overlay mutations. Update geometry after scroll, resize, target resize, and page changes. Any geometry revision cancels pending dwell before reacquisition. Do not rescan the entire DOM on every pointer event. Document a target cap and unsupported behavior.

Default P0 dwell focuses text inputs/textarea or toggles ordinary checkbox/radio. General buttons need eligible physical assisted clicks; submit, implicit submit, file/select picker, destructive or unknown actions retain native paths. Never infer a safe action merely from role=button or text. Programmatic clicks are not trusted physical gestures; do not synthesize a down/up/click cascade to fake them.

For assisted physical clicks, arm on primary mouse press and activate on release only if the unique candidate remains valid. Cancel on leaving, Escape, invalid geometry, or eligibility loss. Suppress only the matching native activation that would duplicate this action, preserving keyboard-generated clicks and unsupported native interactions. Programmatic activation must not recursively trigger your handler. Keep a selection-ID dedup guard.

Revalidate DOM at dispatch. Focus uses focus(); checkbox/radio uses one appropriate native activation, not both manual checked mutation and click. Button activation is one deliberate eligible action, never blanket synthetic events. Report dispatched versus observably confirmed states honestly; external page success is not guaranteed by a click call.

Preserve normal typing, keyboard focus, scrolling, browser controls, touch/pen native behavior, and unsupported widgets. Never globally prevent every pointer/click. Hide the native cursor only in the explicitly enabled mouse-assistance area, restore exactly on disable, and provide immediate Escape/disable.

Implement only my next stage. Return actual build/load instructions, changed files, engine imports, runtime adapters, checks run, unsupported cases, and handoff.
~~~

## Stage 1: load and enable

~~~text
Implement production bundling with worker module, standalone content bundle, popup/options entrypoints, copied assets, and manifest. Mount Kripa UI or minimal adapter-compatible placeholders. Add explicit enable/disable with idempotent injection and a disposable overlay. Acceptance: load unpacked; enable twice yields one overlay/listener set; disable restores cursor/styles/listeners; unsupported internal page gives readable state. No hardware required.
~~~

## Stage 2: discover and render

~~~text
Implement discovery, geometry, stable IDs, occlusion/eligibility policy, and pointer input. Wire Person 4's actual engine and shared settings. Render filtered pointer, candidate, ambiguity, and progress with overlay graphics pointer-transparent. Acceptance: two uninstrumented fixture layouts work; scrolling/resizing/removing a target cancels and updates correctly; typing/keyboard/scrolling remain native; your observer ignores overlay updates.
~~~

## Stage 3: actions and cancellation

~~~text
Implement focus/toggle dwell, physical assisted click boundary, release cancellation, target revalidation, at-most-once guard, and rearm. Preserve submit and unsupported-control native paths. Add focused browser checks for duplicate activation, recursive synthetic click, Escape, target removal, occlusion, and disabled state. Acceptance: long hover activates once, exit rearms, canceled dwell cannot fire, keyboard still activates once, and native fallback does not get swallowed.
~~~

## Stage 4: device and UI adapters

~~~text
Connect worker to Dev's actual mock/live endpoint with auth, schema validation, snapshot, keepalive, backoff, and restart recovery. Implement Kripa adapters, settings revision conflicts, source/quality routing, and optional cue after a confirmed eligible selection. Sensor loss cancels pending dwell once but subsequent local software assistance works. Acceptance: malformed frame rejected, backend absent does not freeze pointer, restart does not replay motor/action, all source badges remain honest.
~~~

## Stage 5: production demo

~~~text
Package and load the exact production dist. Demonstrate two different ordinary form pages without site adapters. Add a clearly labeled developer-only raw-virtual-pointer synthetic test if agreed; never inject fake physical OS cursor motion or label it live. Run cleanup/re-enable, navigation, worker restart, and unsupported-control matrix. Document supported behavior and actual load/reload commands.
~~~

## Key handoffs

Kripa receives real adapters and mount/build paths. Person 4 receives geometry snapshots and numerical bugs without DOM code copied into their package. Dev receives exact handshake/permission failures. When the engine is not ready, use one removable deterministic fake implementation, never a private permanent filter.
