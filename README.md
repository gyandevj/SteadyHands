# SteadyHand: extension-first project blueprint

**Product:** a Chrome extension that makes supported webpage controls easier to select using a stabilized virtual pointer and cancellable dwell. An optional UNO Q peripheral measures motion. A dashboard handles setup, calibration, and evidence.

**Team:** Dev, Kripa, Person 3, Person 4. **Status:** detailed build instructions and a documentation scaffold. Application source files listed in the tree are planned files, not implemented code. **Working name:** SteadyHand; rename branding later without changing the architecture.

## Start here

1. Everyone reads [plan.md](plan.md), [AGENTS.md](AGENTS.md), and [docs/contracts.md](docs/contracts.md).
2. Each person reads their file in `teams/` and the README in each folder they own.
3. Create the planned source files from [docs/repository_tree.md](docs/repository_tree.md), in small increments.
4. Prove software-only extension selection first. Integrate live hardware as a separate vertical slice.
5. Run the checks in [docs/testing.md](docs/testing.md) and rehearse [docs/demo.md](docs/demo.md).

## Named ownership

| Person | Sector | Exclusive primary folders |
| --- | --- | --- |
| **1: Dev** | Backend, hardware, system integration | `services/bridge/`, `firmware/unoq/`, `packages/contracts/`, `scripts/`, root build configuration |
| **2: Kripa** | Frontend and UI/UX | `apps/dashboard/`, `packages/ui/`, `apps/extension/src/popup/`, `apps/extension/src/options/`, `design/` |
| **3** | Chrome extension and webpage integration | `apps/extension/` except Kripa's two UI folders; `tests/extension/` |
| **4** | Algorithms, signal processing, evidence | `packages/engine/`, `analysis/`, `apps/fixtures/`, `fixtures/`, `tests/engine/`, `tests/analysis/`, `evidence/` |

This gives Dev most backend and all hardware implementation while keeping three useful software streams independent. Person 3 is the extension specialist. Person 4 supplies reusable numerical logic to both Dev and Person 3.

## Main documents

| Document | Use |
| --- | --- |
| [plan.md](plan.md) | Scope, dependencies, schedule, milestones, folder boundaries |
| [docs/repository_tree.md](docs/repository_tree.md) | Complete proposed project tree and owner markers |
| [docs/architecture.md](docs/architecture.md) | Extension, dashboard, backend, sensor, runtime lifecycle |
| [docs/contracts.md](docs/contracts.md) | Canonical messages, APIs, module signatures, fixtures |
| [docs/hardware.md](docs/hardware.md) | Conditional sensor identification, UNO Q wiring, optional haptics |
| [docs/ux.md](docs/ux.md) | User flows, visual direction, accessibility states |
| [docs/testing.md](docs/testing.md) | Meaningful checks, compatibility matrix, benchmark |
| [docs/demo.md](docs/demo.md) | Judging sequence, evidence, fallbacks, honest claims |
| [docs/workflow.md](docs/workflow.md) | Parallel vibe-coding workflow and prompt conventions |
| [docs/sources.md](docs/sources.md) | Current official references and unresolved facts |

## Copy-ready prompts

- [Global project prompt](prompts/global.md)
- [Dev's implementation prompts](teams/01_dev.md)
- [Kripa's implementation prompts](teams/02_kripa.md)
- [Person 3's implementation prompts](teams/03_extension.md)
- [Person 4's implementation prompts](teams/04_algorithms.md)
- [Final integration prompt](prompts/integration.md)

Each team file includes a long kickoff prompt, staged follow-up prompts, folder permissions, handoffs, and acceptance criteria. Paste the global prompt once, then the appropriate stage prompt. Do not ask a coding model to implement the whole repository at once.

## Product promise

Enable the extension on a supported page, choose assistance, and interact with ordinary controls more comfortably. The stabilized pointer remains inside webpages. Hardware is optional and does not provide screen coordinates. The sensor measures motion features rather than diagnosing a condition. Haptics, if built, confirm selection rather than canceling tremor.

We aim to demonstrate reusable assistance on two independently built form pages, reliable behavior during faults, and measured technical results. Actual benefit for intended users remains an evaluation question. Winning a hackathon cannot be guaranteed.
