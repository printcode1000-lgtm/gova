# Protected Doc Change Task Checklist

Use **only** when the task explicitly requires changing a binding contract: a runtime/knowledge contract, an architecture rule, a release/CI/touch-UI/page-snapshot policy, this mutability system itself, or an agent instruction surface. If the task is ordinary feature work, stop and use [Editable Doc Change Task](./editable-doc-change-task.md) instead — see [Protected Docs](../contracts/protected-docs.md) "What To Do Instead".

## Context Pack Target Example

```bash
npx tsx scripts/docs/context.ts docs/09-agent-knowledge/runtime-contract.md
```

## Docs To Read First

- `docs/09-agent-knowledge/document-mutability.md`
- `docs/09-agent-knowledge/contracts/protected-docs.md`
- `docs/09-agent-knowledge/document-mutability.json` (the registry itself)
- The specific protected document being changed, in full

## Protected Docs: May They Be Touched?

**Yes — this is the one template where the answer is yes**, and only for the specific protected path(s) the explicit request names. Authorization is still mandatory:

- include `[docs-contract-change]` in the commit message, **or**
- set `DOCS_CONTRACT_CHANGE=1`/`true` for the tooling run.

Update `docs/09-agent-knowledge/document-mutability.json` in the same change if the set of protected/editable/generated paths itself changed (new protected file, path moved, class reclassified).

## Runtime Surfaces To Evaluate

Protected contracts are frequently runtime-topology-defining. Re-evaluate all five explicitly whenever the change touches `runtime-contract.md`, `coverage-contract.md`, or `knowledge-schema.md`: Development, Web, Static `out/`, Android, iOS.

## Required Runtime-Compatibility Checks

```bash
npm run docs:mutability:check
npm run docs:ci
npm run architecture:check
```

If the change affects runtime-topology claims, also re-run the standard non-publishing checks per [Runtime Compatibility Contract](../contracts/runtime-compatibility.md).

## Common Risks

- Forgetting the authorization marker/environment variable — the change fails `docs:mutability:check`/`docs:ci` even if the content is correct.
- Editing a protected contract without updating the other protected surfaces that must stay in parity (for example, updating `runtime-contract.md` without confirming `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and `.cursor/rules/session-standards.mdc` still agree).
- Introducing a new protected concept without adding it to `document-mutability.json`.
- Silently loosening a binding rule ("agents may skip Context Packs", "protected docs are freely editable") — these patterns are explicitly checked for and rejected.
- Using this template for a change that is actually ordinary feature work in disguise.

## Relevant Tests/Checks

```bash
npm run docs:check
npm run docs:mutability:check
npm run docs:ci
npm run architecture:check
```

## Documentation To Update

- The protected document(s) named by the explicit request.
- `document-mutability.json` if the protected/editable/generated path set changed.
- Every agent instruction surface that must stay in parity, if the change affects agent workflow (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/rules/agent-instructions.md`, `.cursor/rules/session-standards.mdc`).

## Forbidden Unless Explicitly Requested

- Committing without the `[docs-contract-change]` marker or `DOCS_CONTRACT_CHANGE` variable.
- Bundling an unrelated protected edit into the same authorized change "while you're in there".
- Skipping the update to `document-mutability.json` when the path set changed.
