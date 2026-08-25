# Architecture Principles

## Purpose

Foundational invariants governing every change in this repository. Agents MUST treat these as non-negotiable unless an ADR explicitly supersedes one.

## Scope

Repository-wide architectural principles. Implementation mechanics are in [07-enforcement/](../07-enforcement/architecture-check.md).

## Invariants

1. **Single capability ownership** — Every significant capability has exactly one `@asol/*` owner. See [capability-map.md](../08-reference/capability-map.md).
2. **Declared doors only** — Consumers MUST import through `package.json` `exports`. Deep imports and relative paths into `packages/` are forbidden.
3. **Composition at boundaries** — Capability packages declare ports; composition roots wire implementations. Capability packages MUST NOT import `@/`.
4. **Mandatory gateways** — Infrastructure access (database, storage, native, push) MUST pass through the owning capability package.
5. **Default deny** — Unregistered packages, unknown directories, and undeclared vendor SDK imports fail `architecture:check`.
6. **Layered application stack** — UI MUST NOT reach repository or database layers directly. See [Application Layers](../10-application-layers/README.md).
7. **Single responsibility** — One clear job per source file and per document. See [single-responsibility.md](./single-responsibility.md).
8. **Enforcement gates the build** — `npm run architecture:check` runs in `build`, `build:static`, and `verify:*` chains.
9. **Dependency-upgrade isolation** — Upgrading Capacitor, AWS SDK, or Android/iOS tooling MUST require changes only inside the owning package (Rule 9 in module isolation).

## Rule / Reason / Failure Prevented

**Rule:** Application code MUST NOT import vendor SDKs registered to another package.

**Reason:** Infrastructure ownership belongs to the authorized capability boundary.

**Failure prevented:** Alternative persistence or native paths that bypass domain validation and mandatory gateways.

## Source Map

- Registry: `packages/architecture-core/src/registry/capability-registry.ts`
- Contract: `packages/architecture-core/src/contracts/contract.ts`
- Runner: `packages/architecture-core/src/runner.ts`
- CLI: `scripts/architecture-check.ts`

## Related Documents

- [Module Isolation Rules](../02-packages/module-isolation-rules.md)
- [Mandatory Gateways](../05-capability-enforcement/mandatory-gateways.md)
- [Capability Ownership](./capability-ownership.md)

## Change Impact

Principle changes require ADR, registry updates, enforcement changes, and synchronized project-wide instruction surfaces.
