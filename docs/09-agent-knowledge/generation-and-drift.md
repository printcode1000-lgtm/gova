# Generation and Drift

## Two Truth Classes

### Generated truth

Facts tooling can derive belong in the live Knowledge Graph and optional generated views: packages/ownership, source and owner dependencies, external dependencies, routes, services, native source presence, tests, commands, command invocation, environment key names/consumers, runtime mappings, build artifacts, document inventory, and change-impact relationships.

### Intentional truth

Reasons, policies, invariants, supported flows, failure semantics, operational choices, runtime compatibility requirements, and historical decisions remain hand-written. A generator can discover that Android consumes `out/`; [Project Runtime Contract](./runtime-contract.md) explains why every agent must care.

Do not maintain the same factual inventory manually and automatically. Hand-written docs link to generated/live facts instead.

## Live Graph Is Binding

`scripts/docs/repository-knowledge.ts` builds Knowledge Graph v2 from the **current checkout**. `scripts/docs/context.ts` uses that live graph, so read-before-edit context does not depend on a previously generated file existing.

`scripts/docs/check.ts` validates the live graph on every `npm run architecture:check`, including:

- mandatory node and edge classes;
- all five application runtime nodes;
- `.next` / `out/` producer-consumer topology;
- Android/iOS source runtime mappings;
- server route-handler exclusion from static/native runtime surfaces;
- owner-level dependency edges;
- owner-to-external dependency edges;
- documentation-domain membership;
- supported agent instruction parity;
- Context Pack five-runtime visibility;
- environment-assignment redaction.

These checks are binding even in a checkout with no generated snapshots.

## Snapshot Generation

The existing architecture generation entry point is repository-wide:

```bash
npm run architecture:docs
```

It regenerates architecture references, then the optional cached views under `docs/09-agent-knowledge/generated/`.

Generated output is deterministic: normalized `/` paths, stable sorting, de-duplication, no timestamps, and no environment values.

## Generated Views

The generator can emit:

- `repository-catalog.md`
- `document-catalog.md`
- `route-catalog.md`
- `change-impact-index.md`
- `runtime-catalog.md`
- `command-catalog.md`
- `environment-catalog.md`
- `graph-health.md`
- `operational-catalog.md`
- `knowledge-graph.json`
- `search-index.json`

When one of these files is committed, byte-for-byte drift becomes binding and `architecture:check` instructs the agent to regenerate it. A fresh checkout does not need a snapshot to obtain correct task context because the live graph is rebuilt from repository truth.

## Secret-Safety Invariant

Environment knowledge contains **names only**. `process.env.KEY`, `.env.example` key names, and root-command assignment names may become graph nodes. Values must not.

The operational renderer replaces command assignments such as `KEY=value` with `KEY=<redacted>`, including values embedded in test commands. The contract has a redaction probe so this behavior cannot silently regress.

## Change Rules

When graph semantics change:

1. update `knowledge-schema.md` and `coverage-contract.md` as applicable;
2. update `runtime-contract.md` if runtime meaning/topology changes;
3. update the scanner/model/renderer in one coherent change;
4. run `npm run architecture:docs` when generated views are maintained in the checkout;
5. run `npm run architecture:check` and inspect graph/catalog diffs;
6. run relevant targeted tests/type/lint/build gates.

When hand-written docs change, ensure links and source-of-truth paths still exist and avoid introducing parallel manual inventories.
