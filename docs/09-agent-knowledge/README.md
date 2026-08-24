# Agent Knowledge System

## Purpose

This domain is the machine-oriented coordination layer above the project documentation. It turns repository structure and intentional documentation into a relational knowledge model that agents can query before editing.

The primary design question is: **given one target file or capability, can an agent discover every material owner, boundary, dependency, consumer, route, service, test, document, and verification rule that could make the change unsafe?**

## Components

| Component | Purpose |
|---|---|
| [Agent Protocol](./agent-protocol.md) | Required read-before-edit workflow |
| [Knowledge Schema](./knowledge-schema.md) | Node and edge vocabulary used by the repository graph |
| [Context Packs](./context-packs.md) | Small task-specific context instead of bulk documentation reads |
| [Generation and Drift](./generation-and-drift.md) | Generated truth, deterministic generation, validation |
| [Authoring Standard](./authoring-standard.md) | Rules for useful, non-duplicative hand-written docs |
| `domain-registry.json` | Intentional mapping between documentation domains and repository source prefixes |
| `generated/` | Overwrite-only repository snapshots |

## Commands

```bash
# Task-specific context for a file, directory, package, feature, service, route, or search term
npx tsx scripts/docs/context.ts src/features/notifications
npx tsx scripts/docs/context.ts @asol/page-save-core
npx tsx scripts/docs/context.ts deployment

# Regenerate architecture + repository knowledge snapshots
npm run architecture:docs

# Validate architecture and knowledge-system invariants
npm run architecture:check
```

## Design Principles

1. **Repository-grounded:** generated facts come from code and manifests, not prose memory.
2. **Relational:** knowledge is stored as nodes and typed edges, not isolated documents.
3. **Task-sized:** agents receive the smallest useful context pack for a target.
4. **Deterministic:** generated artifacts contain no timestamps and sort stable collections.
5. **Default-deny for uncertainty:** if ownership or impact cannot be established, the agent must inspect the owning domain instead of assuming safety.
6. **No secret material:** environment discovery may expose key names, never values.
7. **Intent stays human-readable:** generated catalogs do not replace rationale, invariants, ADRs, or operational policy.

## Data Flow

```text
repository code + manifests + architecture registries + manual docs
                         |
                         v
              scripts/docs repository scan
                         |
                         v
                 KnowledgeGraph
              nodes + typed edges
                 /           \
                v             v
        generated catalogs   live context pack
                |             |
                +-------> coding agent
```

## Relationship to Architecture Docs

`docs/01-architecture/` remains authoritative for architectural intent and package rules. This domain does not duplicate those rules; it makes them discoverable alongside live repository relationships.

For a package or infrastructure change, the context pack deliberately pulls architecture entry points into **Read First** even when the target name alone would not have found them.
