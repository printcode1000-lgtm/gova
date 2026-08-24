# Gova Project Knowledge Base

## Purpose

This directory is the canonical, agent-first knowledge surface for the repository. It is designed so a coding agent can discover the smallest complete set of facts, constraints, relationships, runtime implications, tests, and operational risks needed for a change before editing code.

The system separates **generated truth** from **intentional truth**:

- Generated truth comes from repository structure, architecture registries, package manifests, source imports, native source, routes, services, tests, commands, environment key names, configs, runtimes, and build artifacts.
- Intentional truth explains why the system is designed this way, which invariants must survive, and which operational decisions are deliberate.
- ADRs preserve historical rationale.
- Troubleshooting records preserve failure evidence and proven remedies.

## Permanent Runtime Knowledge — Never Skip

Gova is delivered through **five application surfaces that every agent must evaluate on every change**:

1. **Development** — `next dev` plus optional Capacitor live reload.
2. **Web** — server-capable Next.js `.next` runtime/deployment.
3. **Static `out/`** — static export with no bundled App Router API handlers.
4. **Android** — Capacitor Android shell consuming `out/` plus Android-native behavior.
5. **iOS** — Capacitor iOS shell consuming `out/` plus iOS-native behavior.

A change may directly touch only one surface, but none may be silently ignored. Shared application/browser code normally reaches `out/`, and production Android/iOS consume that static payload.

Canonical contract: [Project Runtime Contract](./09-agent-knowledge/runtime-contract.md).

## Mandatory Agent Workflow

Before changing code, configuration, packages, scripts, services, Android/iOS source, or documentation:

1. Identify the narrowest target path/capability/route/command/environment key/runtime/artifact.
2. Run `npx tsx scripts/docs/context.ts <target>`.
3. Read the returned **Project Runtime Contract**, **Target Runtime Footprint**, **Read First**, **Change Impact**, dependencies/consumers, routes/services, commands/artifacts/config/environment keys, tests, and guardrails.
4. Explicitly evaluate Development, Web, Static `out/`, Android, and iOS. Missing direct graph evidence is an evidence gap, not permission to ignore a surface.
5. Follow links into relevant domain documents only as needed.
6. Make the change through the owning capability and declared gateways; never bypass package/runtime boundaries.
7. Update intentional documentation when behavior, policy, API/data contracts, architecture, configuration, runtime compatibility, or operations change.
8. Run targeted verification, then `npm run typecheck && npm run lint && npm run architecture:check`; use `npm run build` when the full server/web release gate is required.

If the context command cannot run, start here, then read `docs/09-agent-knowledge/runtime-contract.md`, the matching domain `README.md`, and `docs/01-architecture/README.md` for architectural work.

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
| [07-mobile-and-release](./07-mobile-and-release/README.md) | Capacitor, Android/iOS, static bundle, OTA, deployment, release, secrets, cloud-agent environments |
| [08-troubleshooting](./08-troubleshooting/README.md) | Recurring failures, symptoms, diagnosis, verified fixes |
| [09-agent-knowledge](./09-agent-knowledge/README.md) | Knowledge Graph v2, runtime contract, context packs, coverage contract, generation and drift |

## Search Strategy

Agents search in this order:

1. **Live Context Pack** for the exact target.
2. Exact package, feature, route, service, command, environment key, runtime, artifact, table/schema term, or error message.
3. Matching domain `README.md` plus `runtime-contract.md`.
4. Generated catalogs under `09-agent-knowledge/generated/` when present for repository-wide browsing/external tools.
5. ADRs and troubleshooting only when rationale or failure history is needed.

Do not read the whole documentation tree by default. The goal is minimum context with complete impact coverage.

## Sources of Truth

| Fact | Prefer |
|---|---|
| Package owner / layer / public doors / vendor ownership | `packages/architecture-core` registries + package `exports` |
| Source and owner dependency edges | Live production imports |
| Application feature doors | Architecture application-feature registry |
| Routes | `src/app/**/page.*` and `src/app/**/route.*` |
| Services | `services/*` |
| Native source/config | `android/`, `ios/`, `capacitor.config.ts`, `@asol/native-core`, Fastlane tooling |
| Runtime/artifact topology | `next.config.ts`, `capacitor.config.ts`, `scripts/build-static.ts`, `scripts/docs/runtime-knowledge.ts` |
| Root commands | `package.json` scripts; graph stores identities/relations, generated text redacts env assignments |
| Tests | Repository test files + root npm scripts |
| Environment variables | Runtime code and `.env.example` key names; never values |
| Deployment behavior | Deployment code/config, then `07-mobile-and-release` for intentional policy |
| Why a rule exists | Hand-written architecture/runtime docs / ADRs |
| Known failure and remedy | `08-troubleshooting/problems/` |

## Knowledge Contracts

- [Agent Protocol](./09-agent-knowledge/agent-protocol.md) — how every task begins and ends.
- [Project Runtime Contract](./09-agent-knowledge/runtime-contract.md) — permanent five-surface knowledge.
- [Coverage Contract](./09-agent-knowledge/coverage-contract.md) — what the documentation/graph system must always be able to answer.
- [Knowledge Schema](./09-agent-knowledge/knowledge-schema.md) — Graph v2 nodes and relationships.
- [Context Packs](./09-agent-knowledge/context-packs.md) — bounded live retrieval behavior.

## Generation and Drift

`npm run architecture:docs` regenerates architecture references and optional repository-wide knowledge snapshots. `npm run architecture:check` validates the **live** graph contract, agent instruction parity, runtime/artifact topology, domain coverage, redaction invariants, and any committed snapshot drift.

Generated files are overwrite-only cached views. Change source code, registries, manifests, or intentional docs, then regenerate; never repair generated facts by hand.

See [Generation and Drift](./09-agent-knowledge/generation-and-drift.md).

## Documentation Authoring Rule

All project documentation is English and lives under `docs/`. Hand-written documents should explain intent, invariants, flows, failure modes, safe-change rules, and relevant runtime implications. Facts that can be derived automatically should link to live/generated catalogs instead of being duplicated.

Use [Authoring Standard](./09-agent-knowledge/authoring-standard.md) for new or substantially rewritten documents.
