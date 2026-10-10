# Parallel vibe-coding workflow

## 1. Before prompting

Use one repository and four sector branches or worktrees. Do not point four coding sessions at the same uncommitted files. Dev initializes root tooling; each owner adds their own module configuration. Agree on the contracts and imports before generating large amounts of source.

Paste [global prompt](../prompts/global.md) once, then the appropriate stage in your team file. Ask the model to inspect the real repository and tell it which stage is authorized. A file tree is a plan, not evidence that code exists.

## 2. Working agreement

- Branches: `dev/backend-hardware`, `kripa/ui`, `person3/extension`, `person4/algorithms`.
- Own your listed directories. Send interface-change requests with the exact type/function and affected consumers.
- Merge small vertical slices. Avoid a 50-file generated rewrite before the first runnable result.
- Update your module README with the commands that actually work.
- Shared contract changes belong to Dev after agreement; owners update their consumers.
- Root dependency and lockfile changes are coordinated through Dev. A local build fix should not downgrade unrelated modules.
- Keep fake adapters and source labels explicit. Mock progress is useful but is not live integration.

## 3. Prompt shape

Every prompt should specify: goal, read-first files, allowed paths, exact contracts, failure behavior, acceptance checks, and required handoff. Ask the model to implement one bounded stage, run appropriate checks, and report unverified assumptions.

Do not ask for “production ready,” “100% accurate,” “works on every website,” or “make it perfect.” State concrete behaviors such as: “Escape during dwell produces no activation and clears progress.”

## 4. Handoff format

```text
Stage completed:
Files changed:
New exports/endpoints/messages:
Fixture or reproduction:
Checks actually run and results:
Known unsupported cases:
Consumer action needed:
```

The handoff should let another person run the feature without reading your whole coding conversation.

## 5. Checkpoints

At each checkpoint, demonstrate an executable result. Example: extension discovers targets; mock service streams schema-valid frames; UI handles stale state; filter passes variable-dt and cancellation checks. Screenshots alone do not establish integration.

If something fails, reduce the reproduction to one fixture and one interface. Debug with the owner before regenerating entire modules. Copying another model's private schema is not an integration fix.

## 6. Optional agent use

The provided prompts are for your four human-owned coding sessions. They do not require parallel AI agents. If you later use agent tooling, keep the same folder boundaries and review discipline, and explicitly authorize that workflow in your coding environment.
