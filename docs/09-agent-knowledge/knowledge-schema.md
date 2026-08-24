# Knowledge Schema

## Purpose

The repository knowledge graph provides stable vocabulary for relationships that agents need during change-impact analysis. It is deliberately simple, deterministic, and serializable as JSON.

## Node Model

Every node has:

| Field | Meaning |
|---|---|
| `id` | Stable repository-relative identity such as `package:@asol/data-core` or `doc:docs/02-data-and-storage/current-databases.md` |
| `kind` | `document`, `package`, `feature`, `route`, `service`, `script`, `test`, `config`, or `source` |
| `name` | Human/searchable display name |
| `path` | Repository-relative path when the node maps to a file or directory |
| `summary` | Short derived description where available |
| `tags` | Search terms such as package names, route paths, domain names, and source prefixes |

## Edge Model

Every edge is directional and typed:

| Edge | Meaning |
|---|---|
| `contains` | A domain/container owns a nested repository element |
| `imports` | Production source imports another known source/package |
| `belongs-to` | A file belongs to a feature/package/service/domain |
| `references` | A document names or links another repository object |
| `documents` | A document intentionally covers a repository source prefix/domain |
| `tests` | A test is associated with the subject it verifies |
| `related-to` | Intentional weaker relationship supplied by the domain registry |

Edges may carry `detail` such as the exact import specifier or Markdown target.

## Identity Rules

- Paths are normalized to `/` on every platform.
- Collections are sorted before rendering.
- Generated artifacts contain no wall-clock timestamps.
- A package node uses its npm package name, not only its folder name.
- Routes are derived from App Router page/route files; route groups `(group)` and parallel slots `@slot` are removed from the URL identity.
- Generated output never stores environment values.

## Graph Traversal for Context Packs

Context generation starts with exact/high-confidence seed nodes, then expands a bounded neighborhood:

```text
target
  -> owner / belongs-to
  -> documents / references
  -> direct imports
  <- direct consumers
  -> tests
  -> routes / services sharing the owner
```

This bounded traversal avoids flooding the agent with transitive repository noise. Architectural entry documents are added as guardrails for package, infrastructure, and cross-runtime targets even when not reached by textual similarity.

## Source of Truth

The TypeScript interfaces live in `scripts/docs/model.ts`; this document defines their intended semantics. If the implementation changes the vocabulary, update this document in the same change.
