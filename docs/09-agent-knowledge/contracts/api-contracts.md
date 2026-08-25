# API Contract Catalog

## Purpose

Defines what the API Contract Catalog is for, the fields it carries per route, and why static/native impact is a first-class field rather than an afterthought. The catalog turns `src/app/**/route.*` handlers from an implicit list of files into an explicit, queryable contract surface.

## What It Covers

Every App Router request handler under `src/app/api/**` (and any other `route.*` file), one entry per route. This is a superset view over the `route` nodes already in the Knowledge Graph (see [Knowledge Schema](../knowledge-schema.md)), focused specifically on the request/response contract and cross-runtime consequence instead of general graph relationships.

## Fields

| Field | Meaning |
|---|---|
| Route path | The App Router path, with route groups `(group)` and parallel slots `@slot` normalized out of URL identity, matching graph route-identity rules. |
| HTTP method(s) | Verbs the handler implements. |
| Owner | Package/feature/service that owns the handler, per the same ownership resolution used elsewhere in the graph. |
| Request contract | Expected input shape (body/query/params) as declared/validated in the handler. |
| Response contract | Success and error response shapes the handler returns. |
| Auth requirement | Whether the route requires authentication/authorization, and which gateway enforces it. |
| Environment keys used | Names only — see [Env Safety Matrix](./env-safety.md); never values. |
| Write surface | Whether the handler writes through a declared gateway (`@asol/data-core`, `@asol/storage-core`, `@asol/page-save-core`) — see [Write Surface Map](./write-surfaces.md). |
| Static/native impact | See below. |
| Related tests | Tests that exercise this route, from the graph's `tests` edges. |

## Static/Native Impact Is Mandatory

Every entry must state one of:

- **Web/Development only** — the route is a server handler with no static/native equivalent. It is intentionally absent from `out/` per the [Runtime Contract](../runtime-contract.md)'s classification rule that server route handlers are never bundled into static/native runtime surfaces.
- **Backs a static/native client** — a Static `out/`/Android/iOS client calls this route through the configured remote API base (never same-origin, since `out/` ships no local handler). Name the calling client surface.
- **No known static/native caller** — direct evidence is absent; flag this as an evidence gap rather than assuming safety, per the [Agent Protocol](../agent-protocol.md) escalation rule for "a static/native client depends on a server route without a valid remote API path".

This field exists because the single most common cross-runtime regression is a feature that works in Development/Web (same-origin API available) and silently breaks in Static `out/`/Android/iOS (no local handler, and no remote API base configured for the new route). See the [Runtime Compatibility Contract](./runtime-compatibility.md)'s static/native API invariant.

## Regeneration

The catalog is `generated` truth once materialized: it is derived from the same route/owner/test/environment graph data the Knowledge Graph already builds, not hand-maintained prose. Regenerate with:

```bash
npm run docs:generate
# or, for the architecture-reference subset:
npm run architecture:docs
```

Never hand-edit the generated catalog file. If an entry is wrong or missing, the underlying route/ownership/contract evidence in source is what needs fixing — then regenerate. See [Generation and Drift](../generation-and-drift.md) and [Documentation Update Policy](./documentation-update-policy.md).

## Verification

```bash
npm run docs:ci
npm run architecture:check
```

`architecture:check` enforces the underlying route/runtime graph invariants this catalog depends on (every route has a runtime mapping; server handlers never receive static/android/ios `affects-runtime` edges).

## Related Documents

- [Env Safety Matrix](./env-safety.md)
- [Write Surface Map](./write-surfaces.md)
- [Runtime Compatibility Contract](./runtime-compatibility.md)
- [Knowledge Schema](../knowledge-schema.md)
- [API Task Template](../templates/api-task.md)
