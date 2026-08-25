# Documentation Update Policy

## Purpose

States exactly when a change must update documentation, which class of document to touch, and the two hard boundaries: never hand-edit generated docs, never touch a protected doc without authorization. This is the operational decision rule that [Document Mutability](../document-mutability.md) and [Protected Docs](./protected-docs.md) define the enforcement for.

## When Editable Docs Must Be Updated

Update the matching editable document **in the same change** whenever the change affects:

- behavior visible to a user, another package, or another service;
- an API or data contract (request/response shape, database schema, event payload, environment key meaning);
- architecture (new package, new door, new dependency direction) — note: most architecture documentation itself lives under the protected `docs/01-architecture/` tree; see below;
- configuration (new/renamed config file, new required setting);
- runtime compatibility (a surface among Development/Web/Static `out/`/Android/iOS gains, loses, or changes behavior);
- an operational procedure (how to deploy, rotate a secret, run a recurring script).

Pure typo or comment-only fixes with no behavioral impact are exempt.

**Where to update:** the editable document under the domain that owns the change — `docs/00-overview/`, `docs/02-data-and-storage/`, `docs/03-products-and-commerce/`, the non-protected parts of `docs/04-ui-components/`, `docs/05-platform-features/`, `docs/06-super-admin-and-operations/`, the non-protected parts of `docs/07-mobile-and-release/`, `docs/08-troubleshooting/`, or `docs/09-agent-knowledge/README.md`/`docs/09-agent-knowledge/templates/`. Use `domain-registry.json` (`docs/09-agent-knowledge/domain-registry.json`) or a Context Pack to find the exact owning document; do not create a new document when an existing one already owns the topic.

## Never Hand-Edit Generated Docs

Everything under `docs/09-agent-knowledge/generated/`, plus the specific generated files listed as `class: "generated"` in `document-mutability.json` (for example the architecture reference pages under `docs/01-architecture/08-reference/`), is an overwrite-only output. If a generated fact is wrong or stale:

1. fix the source it was derived from (code, registry, package manifest, config);
2. regenerate with `npm run docs:generate` (or `npm run architecture:docs` for the architecture-reference subset);
3. commit the regenerated file as-is.

A manual edit to a generated file is a mutability violation even if the edit is factually correct — the next regeneration silently reverts it, and `docs:mutability:check`/`docs:ci` treat the hand-edit itself as the problem. See [Generation and Drift](../generation-and-drift.md) for the generated/intentional truth split this rule protects.

## Protected Docs Require Explicit Authorization, Full Stop

If the change genuinely needs to alter a binding rule, a runtime/knowledge contract, an architecture contract, a release/CI/touch-UI/page-snapshot policy, or an agent instruction surface, that is a **protected-class change**:

- include `[docs-contract-change]` in the commit message, or set `DOCS_CONTRACT_CHANGE=1`/`true` for the tooling run;
- update `document-mutability.json` in the same change if the set of protected/editable/generated paths itself changed;
- state explicitly in the change description which protected contract changed and why;
- use the [Protected Doc Change Task](../templates/protected-doc-change-task.md) checklist.

Normal feature work never needs this. If a task description does not explicitly call for a contract/policy change, treat any apparent need to edit a protected file as a signal to re-scope the change toward an editable document instead — see [Protected Docs](./protected-docs.md) § "What To Do Instead".

## Decision Rule

```text
Does the change alter behavior/API/data/config/runtime/operations?
  no  -> no documentation update required (unless a template/checklist needs updating)
  yes -> is the owning document generated?
           yes -> fix the source, regenerate, commit the output. Do not hand-edit.
           no  -> is the owning document protected?
                    yes -> is this task explicitly a contract/policy change?
                             yes -> authorize ([docs-contract-change] or DOCS_CONTRACT_CHANGE=1), then edit
                             no  -> re-scope: write/update an editable document instead
                    no  -> edit the editable document directly, in the same change
```

## Verification

- `npm run docs:mutability:check` — fails on an unauthorized protected diff or a hand-edited generated diff.
- `npm run docs:ci` — the aggregate documentation pipeline; see [Docs CI Contract](./docs-ci.md).
- `npm run architecture:check` — validates registry integrity and the live knowledge-graph/documentation-domain contract.
- `npm run docs:generate` (or `npm run architecture:docs`) — regenerate before committing when a generated fact changed.

## Related Documents

- [Document Mutability](../document-mutability.md)
- [Protected Docs](./protected-docs.md)
- [Docs CI Contract](./docs-ci.md)
- [Editable Doc Change Task](../templates/editable-doc-change-task.md)
- [Protected Doc Change Task](../templates/protected-doc-change-task.md)
- [Generation and Drift](../generation-and-drift.md)
