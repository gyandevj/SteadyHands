# Demo, pitch, and release

## 1. Three-minute sequence

| Time | Operator | Action | Evidence |
| --- | --- | --- | --- |
| 0:00–0:25 | Kripa | Open a plain fixture form; show ordinary native use, then explicitly enable labeled raw-virtual-pointer stress mode | Clear use case and controlled technical baseline |
| 0:25–1:05 | Person 3 | Enable the extension, stabilize, focus a field and dwell-toggle a checkbox | Real extension control with visible cancellation |
| 1:05–1:30 | Person 3 | Open second layout and use the same engine | Reuse without SteadyHand-specific page hooks |
| 1:30–2:00 | Dev | Show live source and physically move mounted sensor; dashboard plots update | Inspectable hardware, actual timestamps and quality |
| 2:00–2:20 | Kripa/Dev | Accept a preset in popup; optional one selection cue | User agency and optional feedback |
| 2:20–2:40 | Dev | Disconnect sensor/service | Software assistance continues and hardware state becomes unavailable |
| 2:40–3:00 | Person 4 | Show actual technical/task results and limits | Honest, measured engineering |

Turn off injected pointer jitter before the live hardware segment. Say: **“This is deliberate motion demonstrating the signal pipeline, not a medical test.”** If a preset recommendation did not pass quality gates, use the manual preset and explain that decision.

## 2. Pitch

> Everyday forms assume precise pointer control. SteadyHand is a Chrome extension that adds a stabilized pointer, controllable target assistance, and cancellable dwell for supported controls. It works locally, including without our sensor. Our optional motion-sensing peripheral makes movement inspectable and can suggest settings the user chooses. We built the extension lifecycle, at-most-once activation, quality-gated analysis, and recovery from device failure. We demonstrate the same engine on different forms and report actual technical results. Our next step is evaluation with intended users and broader website compatibility.

If haptics are built: **“A short optional vibration confirms a selection, and its artifact is excluded from motion analysis.”** If not built, omit it from the feature claim.

## 3. Backup levels

1. Live extension plus live board.
2. Live extension plus clearly labeled recorded sensor trace.
3. Live software-only extension plus a labeled video of live hardware operation.

Never switch to replay while retaining a live badge. A network outage should not erase the core extension demo.

## 4. Questions to prepare for

- **Can it move the real cursor?** The prototype renders a stabilized virtual pointer inside supported webpages.
- **Does it diagnose a condition?** No. Motion features are used to support a user-controlled accessibility experiment.
- **Why is hardware useful?** It adds an independent signal and physical feedback option. Its benefit for choosing settings must be evaluated separately from filter benefit.
- **Does it work everywhere?** The release supports a defined set of top-frame ordinary controls. Unsupported widgets retain normal interaction.
- **What did you invent?** The integrated workflow and reliability engineering are the contribution. Credit existing filters, dwell concepts, sensor libraries, and Chrome APIs.
- **Why no AI?** The core needs predictable local timing. Optional label explanation could be added separately if the event requires a Gemini integration.

## 5. Freeze and submission

Before judging, record versions, build the extension, verify actual endpoint/token setup, restart the service and browser, and run two complete demos. Include a folder ownership summary, actual launch commands, wiring record, code credits, compatibility limits, and evidence. Keep credentials, entered values, and private participant data out of the submission.

No domain registration or public deployment is needed for the demo. Web Store approval is outside the hackathon critical path; use an unpacked extension on the judging laptop.
