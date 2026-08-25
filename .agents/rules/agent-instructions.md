# Agent Instructions & Guidelines

1. **Non-negotiable Rules**:
   - Reply in Arabic to all user chat messages. Code, commands, and file paths stay in their repo language.
   - Be brief, direct, and concise. No filler or tangents.
   - Before editing, run `npx tsx scripts/docs/context.ts <target-path-or-capability>` and read the returned context. If the command cannot run, start at `docs/README.md`, `docs/09-agent-knowledge/runtime-contract.md`, and the matching domain `README.md`.
   - **Five-runtime contract:** every change must explicitly consider Development, Web, Static `out/`, Android, and iOS. Shared client code normally reaches `out/`, and production Android/iOS consume that static payload. App Router API handlers are not bundled into `out/`. Binding details: `docs/09-agent-knowledge/runtime-contract.md`.
   - Touch-only UI: Never use hover states (`hover:`, `:hover`), `cursor-pointer`, or DOM `title` attributes. Use `active:` for press feedback and `focus-visible:` for accessibility.
   - Module isolation: Respect sealed packages under `packages/*`. Never use deep imports.
   - Single responsibility per file: Every file has one clear job and one reason to change.
   - English documentation exclusively under `docs/`.
   - Generated knowledge under `docs/09-agent-knowledge/generated/` is overwrite-only (`generated`). Change source code, registries, manifests, or editable intentional docs, then regenerate with `npm run docs:generate` (or `npm run architecture:docs`). Never hand-edit generated catalogs/graphs/reports.
   - Documentation mutability: protected docs (contracts/agent rules/architecture/runtime policies) require explicit authorization via `[docs-contract-change]` in the commit message or `DOCS_CONTRACT_CHANGE=1`. Normal feature work updates editable docs only. See `docs/09-agent-knowledge/document-mutability.md`.
   - After code changes, run runtime-compatibility checks with `npm run runtime:check` (and surface-specific `runtime:check:*`). Shared/release-relevant code must be evaluated for Static out, Development, Web, Android, and iOS. Dev-only surfaces are checked for Development suitability and non-leakage into release behavior.
   - Documentation CI entry point: `npm run docs:ci`. Violations must stop the developer with loud actionable errors.
   - Never store environment values in generated/documentation knowledge; key names only. Generated command rendering must redact assignments.

2. **Verification Gate**:
   - Run targeted tests first.
   - `npm run typecheck && npm run lint && npm run architecture:check && npm run runtime:check && npm run docs:ci`
   - `npm run build` when the full server/web release gate is required.
   - Do not run `npm run build:static` merely as a generic check because it overwrites the release `out/` bundle.
