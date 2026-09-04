# Agent Knowledge System

## Purpose

This domain is the machine-oriented coordination layer above the project documentation. It turns repository structure and intentional documentation into a relational knowledge model that agents query before editing.

The primary question is: **given one target, can an agent discover every material owner, boundary, dependency, consumer, route, service, runtime, build artifact, command, environment key, external dependency, config, test, document, verification rule, documentation mutability class, and runtime-compatibility test plan that could make the change unsafe?**

## Mandatory Project Fact

Gova has five application surfaces that every agent must consider on every change: **Development, Web, Static `out/`, Android, and iOS**. Read [Project Runtime Contract](./runtime-contract.md). The Context Pack repeats this rule for every query, even when no target-specific runtime edge is found.

## Components

| Component | Purpose |
|---|---|
| [Agent Protocol](./agent-protocol.md) | Required read-before-edit workflow |
| [Project Runtime Contract](./runtime-contract.md) | Binding five-surface runtime/build topology |
| [Document Mutability](./document-mutability.md) | Protected / editable / generated documentation model |
| [Coverage Contract](./coverage-contract.md) | Complete list of documentation/knowledge goals and their enforcement |
| [Knowledge Schema](./knowledge-schema.md) | Knowledge Graph v2 node/edge vocabulary |
| [Context Packs](./context-packs.md) | Bounded task-specific context instead of bulk documentation reads |
| [Generation and Drift](./generation-and-drift.md) | Generated truth, deterministic generation, validation |
| [Authoring Standard](./authoring-standard.md) | Rules for useful, non-duplicative hand-written docs |
| [Project Intelligence](./project-intelligence.md) | The separate, unvalidated agent knowledge model under `.agents/` and how far to trust it |
| `contracts/` | Protected agent contracts (API, writes, env, native, docs CI, runtime compatibility, update policy) |
| `templates/` | Task templates for common change types |
| `document-mutability.json` | Machine-readable mutability registry |
| `domain-registry.json` | Intentional mapping between documentation domains and repository source prefixes |
| `generated/` | Overwrite-only catalogs, graphs, and reports |

## Commands

```bash
# Task-specific context (includes risk + runtime test plan)
npx tsx scripts/docs/context.ts src/features/notifications

# Documentation CI and generation
npm run docs:generate
npm run docs:diff
npm run docs:mutability:check
npm run docs:dead-links
npm run docs:coverage
npm run docs:runtime-coverage
npm run docs:ci

# Runtime-compatibility (safe, non-publishing)
npm run runtime:check
npm run runtime:check:static
npm run runtime:check:dev
npm run runtime:check:web
npm run runtime:check:android
npm run runtime:check:ios
npm run runtime:check:changed

# Architecture + knowledge validation
npm run architecture:docs
npm run architecture:check
```

## Generated Layout

```text
generated/
  catalogs/   # repository, document, route, API, command, environment, native, runtime, operational
  graphs/     # knowledge-graph.json, search-index.json
  reports/    # coverage, write surfaces, env safety, dead docs, runtime matrix, graph health, change impact
```

Legacy flat generated paths are rejected. Regenerate with `npm run docs:generate`.

## Design Principles

1. **Repository-grounded:** generated facts come from code, registries and manifests, not prose memory.
2. **Relational:** knowledge is nodes plus typed edges, not isolated documents.
3. **Runtime-aware:** the five application surfaces are global context, never an optional search result.
4. **Mutability-aware:** protected docs need authorization; editable docs track behavior; generated docs are overwrite-only.
5. **Owner-aware:** file imports are aggregated into package/feature/service dependency edges.
6. **Write-aware:** routes are linked toward write gateways where detectable.
7. **Deterministic:** generated artifacts contain no timestamps and sort stable collections.
8. **Default-deny for uncertainty:** missing evidence is reported as an evidence gap, not interpreted as safety.
9. **No secret material:** environment discovery exposes key names only; command assignments are redacted.
10. **Docs CI enforces the rules:** `npm run docs:ci` fails loudly on unauthorized protected edits, stale generated output, dead docs, env leaks, and broken contracts.
