# Generated Agent Knowledge

Files in this directory are deterministic **cached views** generated from the current repository by `scripts/docs/`. They are overwrite-only and never more authoritative than the live graph built from the current checkout.

Regenerate with:

```bash
npm run architecture:docs
```

Validate the live graph and any committed snapshot drift with:

```bash
npm run architecture:check
```

Generated views can cover repository/domain/package/feature/service inventory, external dependency visibility, routes, owner-level dependencies, Development/Web/Static `out`/Android/iOS runtime relationships, build artifacts, command invocation, configuration, environment key **names and consumers**, tests, documentation relationships, graph health, the relational `knowledge-graph.json`, and a search index.

Environment values are never valid generated knowledge. Command environment assignments are rendered as `<redacted>`.

Do not edit generated facts manually; change their source, runtime/domain registry, or generator and regenerate.
