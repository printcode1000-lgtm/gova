# Gova Project Knowledge Base

## Purpose

This directory is the canonical, agent-first knowledge surface for the repository. It is designed so a coding agent can discover the smallest complete set of facts, constraints, relationships, tests, and operational risks needed for a change before editing code.

The system separates **generated truth** from **intentional truth**:

- Generated truth comes from repository structure, package manifests, source imports, routes, services, tests, and architecture registries. Do not copy these facts into hand-written tables when they can be derived.
- Intentional truth explains why the system is designed this way, which invariants must survive, and which operational decisions are deliberate.
- ADRs preserve historical rationale.
- Troubleshooting records preserve failure evidence and proven remedies.

## Mandatory Agent Workflow

Before changing code, configuration, packages, scripts, or services:

1. Identify the target path or capability.
2. Run `npx tsx scripts/docs/context.ts <target-path-or-capability>`.
3. Read the returned **Read First**, **Change Impact**, **Dependencies / Consumers**, **Tests**, and **Guardrails** sections.
4. Follow links into the relevant domain documents only as needed.
5. Make the change through the owning capability and declared gateways; never bypass package boundaries.
6. Update intentional documentation when behavior, policy, API contracts, architecture, data, configuration, or operations change.
7. Run `npm run typecheck && npm run lint && npm run architecture:check`, targeted tests, then `npm run build` when the task requires the full release gate.

If the context command cannot run, start here, then open the matching domain `README.md` and `docs/01-architecture/README.md` for any architectural change.

## Navigation

| Domain | Use it for |
|---|---|
| [00-overview](./00-overview/README.md) | Product/repository overview, technologies, public account-deletion information |
| [01-architecture](./01-architecture/README.md) | Ownership, package boundaries, dependency rules, composition, runtime boundaries, ADRs, enforcement |
| [02-data-and-storage](./02-data-and-storage/README.md) | Databases, data access, schemas, cache, R2/image storage, environment data contracts |
| [03-products-and-commerce](./03-products-and-commerce/README.md) | Catalog, products, search, sellers, discounts, marketplace orders |
| [04-ui-components](./04-ui-components/README.md) | Touch interaction, page snapshots, theme, shared UI behavior |
| [05-platform-features](./05-platform-features/README.md) | Auth, notifications, maps, network state, page save, follow/favorites, service capabilities |
| [06-super-admin-and-operations](./06-super-admin-and-operations/README.md) | Super-admin, operational monitoring, cloud accounts, data health, live logs |
| [07-mobile-and-release](./07-mobile-and-release/README.md) | Capacitor, native builds, OTA, deployment, release, secrets, cloud-agent environments |
| [08-troubleshooting](./08-troubleshooting/README.md) | Recurring failures, symptoms, diagnosis, verified fixes |
| [09-agent-knowledge](./09-agent-knowledge/README.md) | Knowledge graph, context packs, generation, drift checks, authoring standard |

## Search Strategy

Agents should search in this order:

1. **Context pack** for the exact path/capability.
2. Exact package, feature, route, service, API, table, environment key name, or error message.
3. Matching domain `README.md`.
4. Generated catalogs under `09-agent-knowledge/generated/` for repository-wide discovery.
5. ADRs and troubleshooting only when rationale or failure history is needed.

Do not read the whole documentation tree by default. The goal is minimum context with complete impact coverage.

## Sources of Truth

| Fact | Prefer |
|---|---|
| Package owner / public doors / vendor ownership | `packages/architecture-core` registries + package `exports` |
| Dependency edges | Live production imports |
| Application feature doors | Architecture application-feature registry |
| Routes | `src/app/**/page.*` and `src/app/**/route.*` |
| Services | `services/*` |
| Tests | Repository test files + root npm scripts |
| Environment variables | Runtime code and `.env.example`; never document secret values |
| Deployment behavior | Deployment code/config, then `07-mobile-and-release` for intentional policy |
| Why a rule exists | Hand-written architecture docs / ADRs |
| Known failure and remedy | `08-troubleshooting/problems/` |

## Generation and Drift

`npm run architecture:docs` regenerates architecture references and the repository-wide agent-knowledge snapshots. `npm run architecture:check` validates the knowledge-system contract together with architecture enforcement.

Generated files carry a generated banner and are overwrite-only. Change source code, registries, manifests, or intentional docs, then regenerate; never repair generated facts by hand.

See [Generation and Drift](./09-agent-knowledge/generation-and-drift.md).

## Documentation Authoring Rule

All project documentation is English and lives under `docs/`. Hand-written documents should explain intent, invariants, flows, failure modes, and safe change rules. Facts that can be derived automatically should be linked to generated catalogs instead of duplicated.

Use [Authoring Standard](./09-agent-knowledge/authoring-standard.md) for new or substantially rewritten documents.
