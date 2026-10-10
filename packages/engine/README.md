# Pure interaction engine

**Owner: Person 4.** Read [contracts](../../docs/contracts.md), [testing](../../docs/testing.md), and [team prompts](../../teams/04_algorithms.md).

Implement variable-dt exponential and One Euro filters, bounded target arbitration, hysteresis, and cancellable dwell. Inputs are plain points/rectangles/revisions/configuration. Outputs are pointer, candidate, ambiguity, progress, and a unique selection event.

No DOM, Chrome, React, network, real hardware, or backend imports. Inject time through inputs. The content script steps during stationary dwell and revalidates actual targets before action.

Checks: finite values, pauses, mode/config/geometry resets, ambiguity, deliberate exit, cancel, at-most-once activation, and leave-to-rearm. Raw virtual test mode bypasses smoothing while retaining a clearly labeled test path.
