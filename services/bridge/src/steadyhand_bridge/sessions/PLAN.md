# Non-personal sessions plan

## Purpose and boundaries

The service records bounded task event metadata and exports honest trial summaries, not private page contents or inferred form completion. Person 4 owns experiment/evidence design; Person 3 controls dispatch and Kripa presents results.

## Current state

Directory empty; [contracts](../../../../../docs/contracts.md#8-http-api) list allowed kinds but no complete request/export schema. No database or benchmark results exist.

## Exact proposed files

Existing: none. Planned `store.py`: in-memory bounded session/trial records, dedup by `(session_id,event_id)`, monotonic relative timing and eviction; `export.py`: deterministic non-personal summary/JSON serialization, counts, timeouts, source labels and null when unknown. Parent `models.py` contains agreed request validation; `api/sessions.py` owns route wiring.

## Interfaces and data flow

`POST /v1/sessions` -> ID; `POST /v1/sessions/{id}/events` -> accepted IDs with duplicates ignored; `GET /v1/sessions/{id}/export` -> JSON summary. Allowed kinds `task.started`, `task.completed`, `task.timeout`, `selection.dispatched`, `selection.corrected`, event/trial ID, relative monotonic ms, mode/revision and source. Accept completion only from explicit operator/fixture instrumentation. Resolve metadata fields, pointer-input versus sensor-source fields, retention/eviction and duplicate-conflict semantics with consumers before freezing validation.

## Implementation sequence

1. Agree exact non-personal event and export envelope with Person 4, Kripa and Person 3.
2. Implement strict parser rejecting extra personal/unknown fields and bounded store.
3. Add idempotent event ingestion and deterministic summary, then protected routes.
4. Integrate replay/restart tests without fabricating completions.

## Failure and recovery behavior

Reject unknown session, invalid duration, impossible relative order, giant payload or conflicting duplicate rather than changing past results; exact status codes require agreement. Bounded eviction is visible to caller; restart drops in-memory sessions and does not present partial recovery as complete. No token, full URL, label, HTML, entered value, credentials or browsing history is stored/logged.

## Acceptance checks

- No hardware: duplicate and conflicting IDs, out-of-order time, timeout remains timeout, unknown fields and bounded retention/export checks.
- Board: none required for non-personal session core; optional actual source capture must be labeled.
- Teammates: Person 4 fixture-completion evidence and dashboard empty/real results integration.

## Handoff

Kripa and Person 4 receive agreed event examples and a JSON export with trial counts, errors and timeouts; Person 3 receives exact submission/dedup behavior, never a signal that dispatch proves task completion.

## Copy-ready implementation prompt

```text
Implement bounded non-personal session events and export, not new planning.
Read AGENTS.md, README.md, plan.md, docs/contracts.md, root 01_dev.md,
services/bridge/README.md, this PLAN.md and services/bridge/src/steadyhand_bridge/api/PLAN.md.
Agree missing metadata/export fields with Kripa, Person 3 and Person 4 before
finalizing wire models. Allowed paths services/bridge/** plus Dev-owned
scripts/root config. Validate allowed event kinds and relative milliseconds,
reject page content/URLs/values, dedup event IDs per session and account for
timeout/unknown completion honestly; bound memory and expose eviction.
Run formatter/linter, duplicate/privacy/export tests and package build.
Handoff route examples, retention behavior and actual check results.
```
