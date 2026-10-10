# Global coding prompt

Paste this once at the beginning of each sector's coding session, then paste one stage from that person's team file.

~~~text
You are implementing SteadyHand, an extension-first accessibility prototype for a four-person hackathon team. Work inside the real repository provided to you. Documentation describes planned code; inspect what actually exists before claiming anything works.

Read README.md, AGENTS.md, plan.md, docs/architecture.md, docs/contracts.md, my team file, and each module README relevant to my stage. Identify the stage and allowed paths. Stay within ownership. If a shared contract is missing, describe the exact required change and coordinate with its owner. Do not invent a private schema or regenerate another person's sector.

Architecture:
- MV3 extension is the main product.
- Content script renders a virtual stabilized pointer and runs eligible target acquisition/dwell locally.
- Worker owns permissions, injection, settings, device transport, and validated messages.
- Dashboard handles setup, calibration, device inspection, and evidence.
- Python service handles adapters, timestamps, health, analysis integration, and optional motor commands.
- UNO Q MCU acquires the identified Grove sensor and optionally controls a separately verified actuator.
- Mouse events supply coordinates; sensor data supplies advisory motion features.

Ownership:
1. Dev: services/bridge, firmware/unoq, packages/contracts, scripts, root configuration.
2. Kripa: apps/dashboard, packages/ui, design, extension src/popup and src/options.
3. Person 3: other apps/extension paths and tests/extension.
4. Person 4: packages/engine, analysis, apps/fixtures, fixtures, tests/engine, tests/analysis, evidence.

Implement one bounded vertical slice per prompt. Keep numerical modules pure, transport validation explicit, and extension executable assets packaged locally. Do not add remote scripts, debugger permission, hidden cloud dependency, or a replacement for another owner's module.

Required invariants:
- Software assistance works without hardware/network.
- One selection produces at most one eligible activation.
- Escape, disable, hidden tab, geometry change, target removal, mode change, and relevant fault transition cancel pending dwell.
- Preserve typing, keyboard navigation, scrolling, and unsupported-control fallback.
- No automatic submit, payment, destructive action, or unsupported trusted-picker activation.
- Live, recorded, synthetic, and unavailable states remain distinct.
- No diagnosis, fabricated results, fake motor success, or acceleration-derived cursor position.
- Haptics are opt-in and independently bounded; artifacts invalidate analysis until clean samples return.
- No entered values, HTML, credentials, or browsing history in telemetry.
- No arbitrary backend URL proxy or GPIO command interface.

Before editing, state the stage, existing code inspected, missing prerequisites, and exact acceptance behavior. Then implement. Run meaningful checks for the actual failure risks. Mark unrun browser/hardware checks explicitly. When tooling or hardware is unavailable, complete the independent mock path and state what remains unverified.

End with: stage completed, files changed, exported interfaces, actual commands/checks and results, unsupported cases, consumer handoff, and next stage. Do not call the whole project finished because this stage renders.
~~~

For an existing codebase, append: “Preserve unrelated changes and inspect current implementations before adding replacements.”
