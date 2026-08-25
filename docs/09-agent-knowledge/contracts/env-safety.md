# Env Safety

## Purpose

Defines the safety classification every environment variable **name** receives in the Knowledge Graph, what the generated Env Safety Matrix verifies, and why a server-only secret must never reach a static/native bundle. See [Generation and Drift](../generation-and-drift.md) § "Secret-Safety Invariant" for the no-values rule this contract extends into a per-key risk classification.

## Scope

Applies to every `environment-key` node discovered from `.env.example`, `process.env.KEY` code references, and redacted command assignments. Values are never in scope for this document or its generated evidence — only names, consumers, and classification.

## Generated Evidence

`docs/09-agent-knowledge/generated/reports/env-safety-matrix.md` (source: `scripts/docs/env-safety-matrix.ts`) lists, per key: visibility (`client-visible` for `NEXT_PUBLIC_*`, else `server-only`), static/native classification (`allowed` / `dangerous` / `unknown`), sample consumers, relevance tags (`vercel/database`, `object-storage`, `native/fastlane`, `cloud-agent`, `ota/release`), overall classification, and required runtime checks. Regenerate with `npm run docs:generate`; never hand-edit.

## Classification Rules

- `client-visible`: `NEXT_PUBLIC_*` keys. Safe by convention for static/native bundles because Next.js inlines them at build time.
- `server-only` with a name matching `SECRET|TOKEN|PASSWORD|PRIVATE|KEY$`: classified `dangerous-for-static-native-if-leaked`. Must never reach a static/native bundle or a client-readable code path.
- `server-only` consumed from a non-server `src/` path outside `/api/`: also classified `dangerous-for-static-native-if-leaked` — a signal the consumer may be reachable from client code.
- No discovered consumers: classified `missing/unknown consumers` — an evidence gap, not proof of safety.

## Required Runtime Checks Per Classification

- `dangerous-for-static-native-if-leaked`: `npm run runtime:check:static`, `npm run runtime:check:web`, `npm run docs:ci`.
- Everything else: `npm run runtime:check:changed` is the minimum.

## Common Risks

- Introducing a new server-only secret key that is imported from shared `src/` code without a server boundary.
- Renaming a key without updating `.env.example` and every consumer that references it.
- Pasting an assignment value (`KEY=value`) into documentation, a generated catalog, or a command example instead of the key name.

## Verification

```bash
npm run docs:generate
npm run runtime:check:static
npm run runtime:check:web
npm run docs:ci
```

## Related Documents

- [Generation and Drift](../generation-and-drift.md)
- [API Contracts](./api-contracts.md)
- [Runtime Compatibility Contract](./runtime-compatibility.md)
