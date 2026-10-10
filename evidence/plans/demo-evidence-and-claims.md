# Demo Evidence and Claims Plan (`evidence/plans/demo-evidence-and-claims.md`)

**Owner:** Person 4 (Dedeepya)  
**Consumer:** Entire Team (Demo Presentation)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document defines the strict claims boundaries, pitch defense script, and judge Q&A strategies for SteadyHand. It ensures that the entire team presents a unified, scientifically honest narrative during the hackathon evaluation.

---

## 2. Nonnegotiable Language & Claims Boundaries

To maintain technical credibility and ethical compliance:

| Forbidden Claim / Phrase | Required Honest Replacement | Rationale |
| :--- | :--- | :--- |
| "Simulates Parkinson's disease" | **"Synthetic pointer stress test"** | Jitter injection is a technical benchmark, not a valid physiological model of neurodegenerative disease. |
| "Diagnoses tremor disorders" | **"Measures mechanical movement to suggest pointer assistance"** | The prototype is an accessibility aid, not an FDA-cleared diagnostic device. |
| "Cures or eliminates hand tremor" | **"Attenuates high-frequency jitter on the virtual cursor"** | Software smoothing aids UI targeting; it does not treat physical tremor. |
| "Works on every website" | **"Supports standard top-frame HTML form controls"** | Complex canvas apps, iframes, and closed shadow roots retain native interaction. |
| "100% accurate / zero error" | **"Empirically measured trade-offs between stability and response delay"** | Engineering honesty over fabricated marketing numbers. |

---

## 3. The 3-Minute Hackathon Demo Script Alignment

Conforming strictly to `docs/demo.md`:

- **0:00–0:25 (Kripa):** Open uninstrumented fixture form (`registration.html`). Show ordinary native use, then explicitly activate labeled **Synthetic pointer stress test** to illustrate the difficulty of precise pointing under jitter.
- **0:25–1:05 (Person 3):** Enable SteadyHand extension. Show virtual pointer stabilization, assisted input focus, and dwell-toggle on a checkbox. Demonstrate Escape key instantly cancelling active dwell.
- **1:05–1:30 (Person 3):** Navigate to second layout (`enrollment.html`). Prove the same engine works seamlessly without site-specific code.
- **1:30–2:00 (Dev):** Show live Grove accelerometer stream. Move the sensor physically; point out actual microsecond timestamps, sample rates, and quality flags on the dashboard. Say: **"This is deliberate motion demonstrating the signal pipeline, not a medical test."**
- **2:00–2:20 (Kripa/Dev):** Show advisory preset recommendation on dashboard. Accept the preset in the extension popup. Show optional single selection vibration cue.
- **2:20–2:40 (Dev):** Physically unplug the sensor or stop the service. Show that hardware badge switches to **unavailable**, while local pointer smoothing and dwell continue working flawlessly!
- **2:40–3:00 (Person 4 - Dedeepya):** Present empirical evaluation evidence: Pareto curves (jitter reduction vs phase lag), trial completion times, and unsupported control boundaries.

---

## 4. Defense Strategies for Tough Judge Questions

1. **"Can your extension move the operating system mouse cursor?"**
   - *Answer:* "No. In modern browser security models, web extensions cannot move the OS hardware cursor. SteadyHand hides the native cursor inside enabled pages and renders a high-performance virtual pointer over supported webpage controls, operating completely in user space."
2. **"Does this diagnose or treat Parkinson’s disease?"**
   - *Answer:* "No. SteadyHand is strictly an accessibility aid prototype. Our sensor analysis quantifies physical acceleration energy to suggest comfortable smoothing presets that the user can choose to try. We make no diagnostic, therapeutic, or clinical efficacy claims."
3. **"Why use custom hardware if the software extension works alone?"**
   - *Answer:* "The software-first architecture ensures the user is never stranded if hardware fails. The optional hardware peripheral provides physical motion context, allowing the system to suggest assistance presets without requiring manual calibration tasks, and provides tactile selection confirmation."
4. **"Why didn't you use a machine learning model or LLM in the pointer engine?"**
   - *Answer:* "Pointer interaction requires deterministic, sub-millisecond local execution at 60 to 144 FPS. Running neural inference on every pointer event would introduce unacceptable latency and battery drain. We prioritize low-latency classical signal processing (One Euro filter, IIR filters, and FFT) for predictable, rock-solid control."

---

## 5. Acceptance Criteria

- All team members rehearse and adhere to the language matrix.
- Demo sequence executed twice end-to-end after a full cold restart.

---

## 6. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) finalizing the demo pitch alignment in evidence/.

Read evidence/plans/demo-evidence-and-claims.md and docs/demo.md.

TASK:
1. Verify that all evidence summaries adhere strictly to non-clinical language.
2. Provide a demo rehearsal checklist in evidence/rehearsal_checklist.md.
```
