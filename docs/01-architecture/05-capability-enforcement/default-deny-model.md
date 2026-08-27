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
| Create `src/features/new-thing/` | **Denied** at scan | Added to `APPLICATION_FEATURES` with doors |
| Recreate `src/modules/` or other forbidden roots | **Denied** at scan | Never — use `src/features/` or `src/shared/` |
| New top-level directory with `.ts`/`.js` source | **Denied** at scan | Never — code belongs under `src/`, `packages/`, `scripts/`, or `services/` |
| Duplicate `APPLICATION_FEATURES` name/path | **Denied** at scan | Keep one registry row per feature |
| Stale `permittedDependencies` entry | **Denied** at scan | Remove unused edges or add the real import |
| Multi-line `import { … } from '…'` deep path | **Denied** at scan | Same as single-line — `extractImports` reads both |
| Import `@capacitor/camera` from UI | **Denied** | Never — use `@asol/native-core` |
| Add `exports` subpath without declaration | **Denied** at resolution | Key added to `package.json` + contract test |
| Page component writes to DB | **Denied** | Routed through `@asol/page-save-core` |
| Service account reaches `crypto` task | **Absent** | Only if declaration + credentials exist |
| GitHub Actions correctness gate | **Absent** | Docs validation plus OIDC-only deployment dispatch; correctness via local npm scripts |

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
- Application features: `checks/application-features-contract.ts`, `checks/feature-door-contract.ts`
- Registries: `capability-registry.ts`, `application-features-registry.ts`

## Related Documents

- [Bypass Prevention](./bypass-prevention.md)
- [Architecture Check](../07-enforcement/architecture-check.md)
- [Capability Closure](./capability-closure.md)

## Change Impact

Introducing allow-by-default patterns requires ADR and undermines four-layer enforcement.

## Invariants

1. Unregistered packages fail scan.
2. Unregistered application features fail scan.
3. Unowned vendor imports fail scan.
4. Undeclared export paths / feature doors fail resolution or seal check.
5. Generated architecture docs that drift from registries fail scan.
