# Generated Agent Knowledge Outputs

These files are **overwrite-only**. Never hand-edit them.

Regenerate:

```bash
npm run docs:generate
# or
npm run architecture:docs
```

Validate:

```bash
npm run docs:ci
npm run docs:diff
```

## Layout

```text
catalogs/
  repository-catalog.md
  document-catalog.md
  route-catalog.md
  api-contract-catalog.md
  command-catalog.md
  environment-catalog.md
  native-capability-map.md
  runtime-catalog.md
  operational-catalog.md
graphs/
  knowledge-graph.json
  search-index.json
reports/
  change-impact-index.md
  doc-coverage-score.md
  write-surface-map.md
  env-safety-matrix.md
  dead-docs-report.md
  runtime-compatibility-matrix.md
  graph-health.md
```

Legacy flat paths directly under `generated/` are no longer valid and fail docs CI until removed after regeneration.
