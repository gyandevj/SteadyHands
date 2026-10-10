# Contracts package

**Owner: Dev.** [Canonical contract](../../docs/contracts.md).

Export strict types, runtime schemas, UI adapter interfaces, and canonical JSON examples through @steadyhand/contracts. Preserve one schema rather than UI/backend-specific replacements.

Consumers: dashboard, UI mounts, extension worker/content, engine interfaces. Python service models must validate the same fixtures.

Add versioned changes only after affected owners agree. Hand off examples and invalid-case behavior early. Do not store tokens, raw page content, or entered values in fixtures. Fill build/validation commands after implementation.
