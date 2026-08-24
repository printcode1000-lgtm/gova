# Agent Knowledge System

## Purpose

This domain is the machine-oriented coordination layer above the project documentation. It turns repository structure and intentional documentation into a relational knowledge model that agents query before editing.

The primary question is: **given one target, can an agent discover every material owner, boundary, dependency, consumer, route, service, runtime, build artifact, command, environment key, external dependency, config, test, document, and verification rule that could make the change unsafe?**

## Mandatory Project Fact

Gova has five application surfaces that every agent must consider on every change: **Development, Web, Static `out/`, Android, and iOS**. Read [Project Runtime Contract](./runtime-contract.md). The Context Pack repeats this rule for every query, even when no target-specific runtime edge is found.

## Components

| Component | Purpose |
|---|---|
| [Agent Protocol](./agent-protocol.md) | Required read-before-edit workflow |
| [Project Runtime Contract](./runtime-contract.md) | Binding five-surface runtime/build topology |
| [Coverage Contract](./coverage-contract.md) | Complete list of documentation/knowledge goals and their enforcement |
| [Knowledge Schema](./knowledge-schema.md) | Knowledge Graph v2 node/edge vocabulary |
| [Context Packs](./context-packs.md) | Bounded task-specific context instead of bulk documentation reads |
| [Generation and Drift](./generation-and-drift.md) | Generated truth, deterministic generation, validation |
| [Authoring Standard](./authoring-standard.md) | Rules for useful, non-duplicative hand-written docs |
| `domain-registry.json` | Intentional mapping between documentation domains and repository source prefixes |
| `generated/` | Overwrite-only optional snapshots/catalogs of the live graph |

## Commands

```bash
# Task-specific context for a file, directory, package, feature, service,
# route, command, env key, runtime, artifact, external dependency, or search term
npx tsx scripts/docs/context.ts src/features/notifications
npx tsx scripts/docs/context.ts @asol/page-save-core
npx tsx scripts/docs/context.ts android
npx tsx scripts/docs/context.ts build:static
npx tsx scripts/docs/context.ts NEXT_PUBLIC_ASOL_API_BASE_URL
npx tsx scripts/docs/context.ts @capacitor/core

# Regenerate architecture + repository knowledge snapshots
npm run architecture:docs

# Validate architecture and knowledge-system invariants
npm run architecture:check
```

## Knowledge Graph v2

The graph combines:

- architecture capability packages and public ownership metadata;
- external npm dependencies and declaration/import relationships;
- application features and independent services;
- JavaScript/TypeScript source plus tracked Android/iOS/Fastlane text source/config;
- App Router pages and request handlers;
- tests and their verified/imported targets;
- documentation domains and Markdown references;
- root npm commands and command-to-command/source invocation;
- environment key **names** and direct code/command consumers;
- runtime surfaces and configuration;
- build/release artifacts and producer/consumer topology;
- source-level and aggregate owner-level dependency edges.

## Design Principles

1. **Repository-grounded:** generated facts come from code, registries and manifests, not prose memory.
2. **Relational:** knowledge is nodes plus typed edges, not isolated documents.
3. **Runtime-aware:** the five application surfaces are global context, never an optional search result.
4. **Owner-aware:** file imports are aggregated into package/feature/service dependency edges.
5. **Dependency-aware:** external npm packages are explicit graph nodes rather than hidden manifest text.
6. **Native-aware:** Android/iOS source is indexed alongside the web tree.
7. **Task-sized:** structural traversal is bounded and avoids high-cardinality global hubs.
8. **Deterministic:** generated artifacts contain no timestamps and sort stable collections.
9. **Default-deny for uncertainty:** missing evidence is reported as an evidence gap, not interpreted as safety.
10. **No secret material:** environment discovery exposes key names only; command assignments are redacted.
11. **Intent stays human-readable:** generated catalogs do not replace rationale, invariants, ADRs or operational policy.

## Data Flow

```text
repository code + native source + manifests + architecture registries + docs
                               |
                               v
                    scripts/docs live scan
                               |
                               v
                    Knowledge Graph v2
 owners + imports + external deps + runtimes + artifacts + commands + env + docs
                      /                         \
                     v                           v
          generated catalogs              live Context Pack
                     |                           |
                     +-----------> coding agent <+
```

## Relationship to Architecture Docs

`docs/01-architecture/` remains authoritative for architectural intent and package rules. This domain does not replace those contracts; it makes them discoverable alongside live repository relationships and cross-runtime impact.
