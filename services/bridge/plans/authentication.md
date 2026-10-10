# Local pairing and authentication

## Purpose and boundaries

Protect localhost HTTP/WS commands with explicit local pairing and origin restrictions; no cloud account, content-script-provided URL, token in URL, or GPIO proxy. Browser secret storage belongs to Person 3 and Kripa.

## Current state

[Contracts](../../../docs/contracts.md#9-websocket-handshake-and-events) require bearer HTTP, first-frame WS auth within three seconds and restricted origins, but token lifetime/rotation/revocation/WS error envelope and protected-route coverage are not fully specified. No server implementation exists.

## Exact proposed files

Existing: none within implementation package. Planned `src/steadyhand_bridge/auth.py`: create short-lived random token on startup, constant-time comparison, expiry/optional rotation and dependency for protected routes; `config.py`: allowed-origin exact-match policy; `api/stream.py`: validate Origin and first-frame credential before snapshot; `api/{device,calibration,haptics,sessions}.py`: apply bearer dependency; `tests/test_protocol.py`: auth/privacy cases.

## Interfaces and data flow

Operator receives token through controlled launch console output (intentional display is not routine logging); HTTP uses `Authorization: Bearer ...`, WS first frame `client.auth` with token (never query string). Verify extension ID/local dashboard origin against configured allowlist *independently* of token validation; browser CORS is not WS security. Agree exact token TTL, renewal/revoke behavior, absent Origin policy for test clients and route errors with Person 3/Kripa before shipping.

## Implementation sequence

1. Agree outstanding auth lifecycle and route-coverage details; document exact values.
2. Implement protected HTTP dependency, public `/health` and masked operator handoff.
3. Add pre-auth WS gate with three-second deadline and no event before authorization.
4. Verify expiry/re-pair/reconnect and origin policies against actual consumer clients.

## Failure and recovery behavior

Missing, expired or incorrect token rejects protected request and closes unauthenticated socket without snapshot. Wrong Origin fails even with correct token. Bound comparison/malformed token length; never log token/body/URL, re-pair does not replay actions. Shutdown invalidates process-local token; restart requires new pairing unless explicitly agreed otherwise.

## Acceptance checks

- No hardware: health remains public; each `/v1/*` route protected; late/malformed auth, wrong Origin, expiry and token redaction tested.
- Board: test routing/allowed origin on chosen board/laptop deployment, not sensor-dependent.
- Teammates: real extension worker and dashboard re-pair when token expires; pending implementations.

## Handoff

Provide precise operator token-entry steps, protected paths, allowed origins and WS-first-frame example only once the missing wire payload is agreed with Person 3 and Kripa.

## Copy-ready implementation prompt

```text
Implement local HTTP/WS pairing after agreeing token expiry, Origin policy,
route coverage and auth error shapes with Person 3 and Kripa. Read AGENTS.md,
README.md, plan.md, docs/contracts.md, root 01_dev.md,
services/bridge/README.md, services/bridge/PLAN.md and this plan.
Allowed services/bridge/** plus Dev-owned scripts/root config. Use a random
process token displayed once to the operator, bearer on protected HTTP and
first-frame WS auth within three seconds with separate Origin check. Do not
send data pre-auth, log secrets or use URL tokens. On timeout/expiry/restart
fail closed. Run formatter/linter, auth/expiry/origin tests and build; hand
off actual input/error behavior and re-pair instructions.
```
