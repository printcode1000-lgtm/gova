# Protected Doc Change Task

Use only when a task genuinely requires altering a binding rule, a runtime/knowledge contract, an architecture contract, a release/CI/touch-UI/page-snapshot policy, or an agent instruction surface. Read [Document Mutability](../document-mutability.md) and [Protected Docs](../contracts/protected-docs.md) first — this is the rare path, not the default for feature work.

## Context Pack Target Example

```bash
npx tsx scripts/docs/context.ts docs/09-agent-knowledge/runtime-contract.md
```

## Docs To Read

- `docs/09-agent-knowledge/document-mutability.md`
- `docs/09-agent-knowledge/contracts/protected-docs.md`
- `docs/09-agent-knowledge/contracts/documentation-update-policy.md`
- The protected document itself, plus every document that links to it.

## Protected Docs May Be Touched?

**Yes — but only with explicit authorization.** Include `[docs-contract-change]` in the commit message, or set `DOCS_CONTRACT_CHANGE=1`/`true` for the tooling run. Without one of these the default is deny; re-scope into an editable document instead (see [Editable Doc Change Task](./editable-doc-change-task.md)).

## Runtime Surfaces To Evaluate

All five, when the protected document is a runtime/knowledge/architecture contract: a rule change can silently redefine what "safe" means for every other change across Development, Web, Static `out/`, Android, and iOS.

## Required Runtime-Compatibility Checks

```bash
npm run runtime:check
npm run docs:ci
```

## Common Risks

- Editing without authorization — a hard `docs:mutability:check`/`docs:ci` failure.
- Adding a new protected document without registering it in `document-mutability.json` in the same change.
- Silently narrowing/widening a binding rule without stating explicitly in the change description that a protected contract changed and why.
- Using one authorization marker to bulk-unlock unrelated protected edits — authorization is repository-wide for the commit, so scope the change to the genuine contract update only.

## Relevant Tests/Checks

```bash
npm run docs:mutability:check
npm run docs:ci
npm run architecture:check
```

## Documentation To Update

The protected document itself, `document-mutability.json` if the protected/editable/generated path set changed, and every document that references the changed rule (update cross-links; do not duplicate the rule text elsewhere).

## Forbidden Unless Explicitly Requested

- Editing a protected document without `[docs-contract-change]` or `DOCS_CONTRACT_CHANGE=1`.
- Using this template for ordinary feature work — that is [Editable Doc Change Task](./editable-doc-change-task.md).
- Browser/preview/computer-use verification.
