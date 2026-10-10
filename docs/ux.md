# UI and interaction design

**Owner: Kripa.** Person 3 implements webpage mechanics. Person 4 provides the pure interaction engine. Kripa owns how users understand and control the product.

## 1. Visual direction

Use a calm, crisp utility interface with clear typography, spacious controls, restrained color, and excellent state visibility. Avoid a hospital dashboard, a wall of animated graphs, or fake confidence percentages. Main screens prioritize completion and control; technical details are expandable.

Pick a small token system: background, surface, text, muted text, accent, focus, warning, error, spacing, radius, and font sizes. Share it through `packages/ui/src/tokens.css`. Aim for 48 CSS-pixel controls in the extension's own UI as a project design choice. Respect reduced motion and provide visible keyboard focus.

## 2. Popup

The popup answers five questions:

1. Is this page supported and is assistance enabled?
2. Which pointer preset is active?
3. Is dwell enabled, and how long is it?
4. Is hardware connected, and is its data live or simulated?
5. How do I disable everything immediately?

Layout: product name and status, primary Enable/Disable button, Light/Steady/Custom preset selector, dwell toggle and duration, device/source badge, optional recommendation card, Settings/Calibration link. Keep it usable without hardware. A popup closes when focus moves away, so it cannot be the owner of the active pointer or transport.

## 3. Options page

Provide advanced pointer settings, raw-pointer diagnostic toggle, connection endpoint and pairing token fields, haptics opt-in if capability exists, reset settings, and a clear compatibility explanation. Token fields are password-style and never echoed in logs or page overlays.

P0 recommendations are accepted here or in the popup. Acceptance visibly changes settings and cancels active dwell. No modal prompts appear automatically in the middle of a task.

## 4. Dashboard

| Route | Content | Empty/error behavior |
| --- | --- | --- |
| Setup | Connect device, source, actual sensor, capability | Works in labeled synthetic mode; no fake connected state |
| Calibration | Rest, comfortable movement, preview, result | Skip available; bad quality explains retry rather than blaming user |
| Device | XYZ, sample rate, quality, optional spectrum, loss counters | Invalid spectrum hidden or explicitly unavailable |
| Results | Attempts, completions, timeouts, errors, selected settings | Empty data shown before actual trials |

The dashboard's preview settings are local to that preview. Label them **Preview only**. To use a proposed preset on webpages, direct the user to accept it in the extension. Do not show an Apply-to-extension button unless its actual transport exists.

## 5. Page overlay

Person 3 owns the overlay renderer. It displays a stabilized pointer, candidate outline, dwell progress, and a compact status strip. Kripa supplies tokens and component design.

Use a dedicated Shadow DOM root with pointer-transparent graphics. The overlay never obscures the focused field or swallows the page's normal interactions. A diagnostic raw-pointer ghost is optional and clearly differentiated.

An ambiguous target must look ambiguous, not half-selected. A stale sensor indicator must not imply pointer assistance stopped. Show **Software assistance active · device unavailable** where appropriate.

## 6. Language and states

| State | Suggested copy |
| --- | --- |
| Native | “Assistance is off on this page.” |
| Active, no device | “Pointer assistance is active. Hardware is optional.” |
| Calibration warming | “Collecting a clean motion window…” |
| Recommendation | “Try steadier assistance? You can switch back anytime.” |
| Bad data | “Motion data is interrupted. Your current pointer settings remain available.” |
| Motor blanking | “Pausing motion analysis after feedback.” |
| Unsupported control | “Use normal interaction for this control.” |
| Synthetic | “Synthetic technical test” |
| Recorded | “Recorded sensor trace” |

Do not write “Parkinson's detected,” “tremor cured,” or “zero precision required.” Dwell reduces the need for a timed click but still requires reaching a target region. Typography, labels, and status must make these limits understandable without a disclaimer wall.

## 7. Accessibility and review

Use semantic buttons, labels, form inputs, visible focus, clear error descriptions, and predictable keyboard navigation. No status is color-only. Avoid sensor-frame screen-reader spam. The user can disable or remove the peripheral immediately and continue using the page normally.

Ask voluntary participants which settings feel controllable. Do not decide the strongest smoothing is always best. A short completed task with fewer errors and acceptable comfort is more convincing than a dramatic but frustrating cursor animation.
