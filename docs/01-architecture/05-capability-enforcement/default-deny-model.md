# Default Deny Model

## Purpose

Explain the repository default-deny stance: new code, packages, directories, and vendor imports have **no** infrastructure authority until explicitly registered and enforced.

## Scope

Default-deny applies to package registration, vendor SDK usage, application layer shortcuts, and deployment capabilities.

## What is denied by default

| Action | Default | Becomes allowed when |
|---|---|---|
| Import `drizzle-orm` from `src/` | **Denied** | Never — use `@asol/data-core` |
| Create `packages/new-thing/` | **Denied** at scan | Added to `CAPABILITY_PACKAGES` |
| Import `@capacitor/camera` from UI | **Denied** | Never — use `@asol/native-core` |
| Add `exports` subpath without declaration | **Denied** at resolution | Key added to `package.json` + contract test |
| Page component writes to DB | **Denied** | Routed through `@asol/page-save-core` |
| Service account reaches `crypto` task | **Absent** | Only if declaration + credentials exist |
| GitHub Actions CI gate | **Absent** | Enforcement via npm scripts only |

## Enforcement mechanism

```text
Attempt → ESLint (fast) → architecture:check (full scan) → test:*-core (contract)
                ↓ fail any step
           build exits non-zero
```

No per-file waivers. See [enforcement-exceptions.md](../07-enforcement/enforcement-exceptions.md) for the narrow exception list.

## Fail-closed ports

Port defaults deny or no-op until composition registers real implementations:

- Orders super-admin identity
- Data-core telemetry to observability
- Storage profile validation at server startup

Safe defaults prevent crashes but hide misconfiguration — ports-registry test catches missing registration.

## Agent implication

When adding functionality, ask:

1. Which existing owner in [capability-map.md](../08-reference/capability-map.md)?
2. If none, is a new package required ([package-creation-rules.md](../02-packages/package-creation-rules.md))?
3. Which door will consumers use?
4. Which gate proves closure?

Assume **denied** until all four are answered.

## Source Map

- Ownership contract: `checks/capability-ownership-contract.ts`
- Registry: `capability-registry.ts`

## Related Documents

- [Bypass Prevention](./bypass-prevention.md)
- [Architecture Check](../07-enforcement/architecture-check.md)
- [Capability Closure](./capability-closure.md)

## Change Impact

Introducing allow-by-default patterns requires ADR and undermines four-layer enforcement.

## Invariants

1. Unregistered packages fail scan.
2. Unowned vendor imports fail scan.
3. Undeclared export paths fail resolution or seal check.
