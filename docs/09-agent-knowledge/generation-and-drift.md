# Generation and Drift

## Two Truth Classes

### Generated truth

Facts that repository tooling can derive belong in generated output: package inventories and exports, source relationships, routes, services, tests, document inventory, operational command names, environment key names, and change-impact relationships.

### Intentional truth

Reasons, policies, invariants, supported flows, failure semantics, operational choices, and historical decisions remain hand-written. A generator cannot infer why an invariant is required.

Do not maintain the same factual inventory manually and automatically. Link to the generated source instead.

## Generation

The existing architecture generation entry point is extended repository-wide:

```bash
npm run architecture:docs
```

It regenerates architecture reference documents first, then `docs/09-agent-knowledge/generated/` from the current checkout.

Generated outputs are deterministic: paths use `/`, collections are sorted, duplicates are removed, timestamps are omitted, and runtime environment values are never emitted.

## Validation

`npm run architecture:check` includes the agent-knowledge documentation contract. The contract validates required entry points, domain-registry references, graph viability, and generated drift when generated snapshots are present.

This gives two safety layers: live structural validation prevents a broken knowledge system, while snapshot comparison prevents committed generated references from silently lagging the repository.

## Generated Directory

`generated/` is overwrite-only. The generator produces:

- `repository-catalog.md`
- `document-catalog.md`
- `route-catalog.md`
- `change-impact-index.md`
- `operational-catalog.md`
- `knowledge-graph.json`
- `search-index.json`

A human or agent must never repair one of these files directly. Change the repository source or the generator.

## Change Rules

When changing a generator, update its contract/documented semantics, regenerate with `npm run architecture:docs`, run `npm run architecture:check`, and inspect meaningful generated diffs rather than accepting them blindly.

When changing hand-written docs, ensure the document still points at live source-of-truth paths and does not introduce a second manual inventory for generated facts.
