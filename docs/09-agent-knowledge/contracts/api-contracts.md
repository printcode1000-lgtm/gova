# API Contracts

## Purpose

Defines what makes an App Router request handler (`src/app/api/**`, `src/app/**/route.*`) a safe, discoverable API contract, and what the generated API Contract Catalog verifies about it. Read [Project Runtime Contract](../runtime-contract.md) first — handlers are a Web/Development surface, never bundled into `out/`.

## Scope

Applies to every App Router route handler. Does not cover independent `services/*` HTTP surfaces beyond their own documentation domain, and does not replace feature-specific API documentation under `docs/03-products-and-commerce/`, `docs/05-platform-features/`, or similar.

## Generated Evidence

`docs/09-agent-knowledge/generated/catalogs/api-contract-catalog.md` (source: `scripts/docs/api-and-write-catalogs.ts`) lists, per handler: route, source file, detected HTTP methods, inferred auth requirement, owning package/feature/service, write-gateway evidence, runtime surfaces, static/native impact note, related environment key names, related tests, required runtime checks, and risk notes. Regenerate with `npm run docs:generate`; never hand-edit.

## Required Properties Of A Safe Handler

- Declares its HTTP methods as named exports (`GET`, `POST`, ...) so method detection is unambiguous.
- States or enforces its auth requirement explicitly rather than leaving it undetectable.
- Any create/update/delete/upload/save/insert/patch/mutate/publish/remove/upsert operation reaches its target through a declared write gateway (`@asol/page-save-core`, `@asol/data-core`, `@asol/storage-core`) — see [Write Surfaces](./write-surfaces.md).
- Environment keys it reads or assigns are discoverable as **names only** — see [Env Safety](./env-safety.md).
- Is treated as Web/Development-only: static/native clients calling it must use the configured remote API base, because handlers are excluded from `out/`.

## Runtime Surfaces

- **Development / Web:** the handler executes here.
- **Static `out/` / Android / iOS:** never bundled; a static/native caller must hit the configured remote origin, not a same-origin fallback that only works during browser development.

## Common Risks

- HTTP methods or auth requirement the catalog cannot detect (rendered as `unknown`) — a signal to fix, not to ignore.
- A write-like handler with no proven gateway import (`riskNotes: write-like route without proven gateway import`).
- A static/native feature quietly depending on this handler being same-origin.

## Verification

```bash
npm run docs:generate            # regenerate the API Contract Catalog
npm run runtime:check:web
npm run runtime:check:static
npm run runtime:check:dev
npm run docs:ci
```

## Related Documents

- [Write Surfaces](./write-surfaces.md)
- [Env Safety](./env-safety.md)
- [Runtime Compatibility Contract](./runtime-compatibility.md)
- [API Task Template](../templates/api-task.md)
