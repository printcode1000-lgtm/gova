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

Primary docs/knowledge generation:

```bash
npm run docs:generate
```

The broader architecture generation entry point also regenerates knowledge snapshots:

```bash
npm run architecture:docs
```

Generated output lives under `docs/09-agent-knowledge/generated/` in this layout:

```text
catalogs/
graphs/
reports/
```

Legacy flat paths directly under `generated/` are rejected by drift checks. Generated output is deterministic: normalized `/` paths, stable sorting, de-duplication, no timestamps, and no environment values.

## Generated Views

The generator emits:

- catalogs: repository, document, route, API contract, command, environment, native capability, runtime, operational
- reports: change-impact, doc-coverage-score, write-surface-map, env-safety-matrix, dead-docs, runtime-compatibility-matrix, graph-health
- graphs: `knowledge-graph.json`, `search-index.json`

When these files are committed, byte-for-byte drift becomes binding and `docs:ci` / `architecture:check` instruct the agent to regenerate. A fresh checkout does not need a snapshot to obtain correct task context because the live graph is rebuilt from repository truth.

## Secret-Safety Invariant

Environment knowledge contains **names only**. `process.env.KEY`, `.env.example` key names, and root-command assignment names may become graph nodes. Values must not.

The operational renderer replaces command assignments such as `KEY=value` with `KEY=<redacted>`, including values embedded in test commands. The contract has a redaction probe so this behavior cannot silently regress.

## Change Rules

When graph semantics change:

1. update `knowledge-schema.md` and `coverage-contract.md` as applicable;
2. update `runtime-contract.md` if runtime meaning/topology changes;
3. update the scanner/model/renderer in one coherent change;
4. authorize protected-doc edits with `[docs-contract-change]` or `DOCS_CONTRACT_CHANGE=1` when required;
5. run `npm run docs:generate` when generated views are maintained in the checkout;
6. run `npm run docs:ci` and `npm run architecture:check` and inspect graph/catalog diffs;
7. run relevant targeted tests/type/lint/runtime gates.

When hand-written docs change, ensure links and source-of-truth paths still exist, respect document mutability classes, and avoid introducing parallel manual inventories.
