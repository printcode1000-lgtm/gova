# Architecture Knowledge Base

## Purpose

Agent-first, repository-grounded architecture documentation for coding agents (Claude Code, Codex, Cursor, and similar). A future agent MUST be able to determine capability ownership, package boundaries, allowed dependencies, composition roots, runtime boundaries, mandatory gateways, infrastructure ownership, enforcement mechanisms, and safe extension rules from this directory alone.

## Scope

Covers the sealed `@asol/*` package model, application layering, composition wiring, capability enforcement, runtime boundaries, and architecture enforcement. Operational detail for databases, deployment runbooks, UI components, and super-admin operations lives in other `docs/` domains — this tree documents **architectural relationships** and links outward.

## Canonical Sources of Truth

| Subject | Canonical Document |
|---|---|
| Capability ownership | [08-reference/capability-map.md](./08-reference/capability-map.md) |
| Package inventory | [08-reference/package-catalog.md](./08-reference/package-catalog.md) |
| Inter-package dependencies | [08-reference/dependency-map.md](./08-reference/dependency-map.md) |
| Module isolation rules | [02-packages/module-isolation-rules.md](./02-packages/module-isolation-rules.md) |
| Architecture enforcement | [07-enforcement/architecture-check.md](./07-enforcement/architecture-check.md) |
| Application layer stack | [10-application-layers/README.md](./10-application-layers/README.md) |
| Historical decisions | [09-decisions/README.md](./09-decisions/README.md) |

Preserved historical source (read-only): the pre-reconstruction architecture docs (see git history).

## Organization

```text
docs/01-architecture/
├── README.md                    ← you are here
├── 00-glossary.md               ← architectural vocabulary
├── 01-principles/               ← invariants and design principles
├── 02-packages/                 ← sealed package model
├── 03-dependencies/             ← dependency rules, ports, contracts
├── 04-composition/              ← wiring and composition roots
├── 05-capability-enforcement/   ← gateways, closure, infrastructure ownership
├── 06-runtime-boundaries/       ← browser/server/native/service boundaries
├── 07-enforcement/              ← architecture:check, sealing, exceptions
├── 08-reference/                ← capability map, package catalog, dependency map
├── 09-decisions/                ← ADRs (historical rationale)
└── 10-application-layers/       ← UI → DB layer stack (enforced contract)
```

## Recommended Reading Order

1. [Architecture Principles](./01-principles/architecture-principles.md)
2. [Module Isolation Rules](./02-packages/module-isolation-rules.md)
3. [Capability Map](./08-reference/capability-map.md)
4. [Package Catalog](./08-reference/package-catalog.md)
5. [Composition Model](./04-composition/composition-model.md)
6. [Mandatory Gateways](./05-capability-enforcement/mandatory-gateways.md)
7. [Architecture Check](./07-enforcement/architecture-check.md)

## Task-Oriented Navigation

| If you are… | Read first |
|---|---|
| Changing an existing `@asol/*` package | [capability-map.md](./08-reference/capability-map.md) → [module-isolation-rules.md](./02-packages/module-isolation-rules.md) → package `test:*-core` |
| Creating a new package | [package-creation-rules.md](./02-packages/package-creation-rules.md) → [capability-registry.ts](../../packages/architecture-core/src/registry/capability-registry.ts) |
| Adding infrastructure access (DB, R2, Capacitor, etc.) | [infrastructure-ownership.md](./05-capability-enforcement/infrastructure-ownership.md) → [default-deny-model.md](./05-capability-enforcement/default-deny-model.md) |
| Changing composition / port wiring | [composition-roots.md](./04-composition/composition-roots.md) → [ports-and-contracts.md](./03-dependencies/ports-and-contracts.md) |
| Adding a new service deployment | [service-composition.md](./04-composition/service-composition.md) → [service-boundaries.md](./06-runtime-boundaries/service-boundaries.md) |
| Changing runtime exports (browser vs server) | [browser-server-boundaries.md](./06-runtime-boundaries/browser-server-boundaries.md) → [package-exports.md](./02-packages/package-exports.md) |
| `npm run architecture:check` fails | [architecture-check.md](./07-enforcement/architecture-check.md) → [enforcement-exceptions.md](./07-enforcement/enforcement-exceptions.md) |
| Introducing a new capability | [capability-closure.md](./05-capability-enforcement/capability-closure.md) → [package-creation-rules.md](./02-packages/package-creation-rules.md) |
| Understanding why a decision was made | [09-decisions/README.md](./09-decisions/README.md) |

## Related Documents

- [AGENTS.md](../../AGENTS.md) — operational agent rules referencing this tree
- [docs/02-data-and-storage/](../02-data-and-storage/) — data persistence operational detail
- [docs/07-mobile-and-release/](../07-mobile-and-release/) — deployment and mobile release detail

## Change Impact

Restructuring this tree requires updating all cross-references in `docs/`, `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`, and any code comments pointing at old paths.
