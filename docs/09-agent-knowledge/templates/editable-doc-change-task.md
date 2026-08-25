# Editable Doc Change Task Checklist

Use for the default case: documenting a behavior/API/data/config/runtime/operational change made during ordinary feature work. This is the checklist almost every documentation update should follow.

## Context Pack Target Example

```bash
npx tsx scripts/docs/context.ts docs/05-platform-features/README.md
```

## Docs To Read First

- `docs/09-agent-knowledge/contracts/documentation-update-policy.md`
- `docs/09-agent-knowledge/authoring-standard.md`
- The owning domain's `README.md` (use `docs/09-agent-knowledge/domain-registry.json` to find it)
- The specific editable document being updated, in full

## Protected Docs: May They Be Touched?

**No.** If following this checklist leads to "the only place to say this is a protected file," stop — that is a signal to either link to the protected contract instead of restating it, or to re-scope as a [Protected Doc Change Task](./protected-doc-change-task.md) with explicit authorization.

## Runtime Surfaces To Evaluate

Whatever surfaces the underlying code change actually affects — state them explicitly in the doc using the compact form from [Authoring Standard](../authoring-standard.md#runtime-writing-rule):

```text
Runtime Surfaces
- Development: ...
- Web: ...
- Static out / Android / iOS: ...
```

Do not copy the full five-surface matrix into the document; link to [Project Runtime Contract](../runtime-contract.md) instead.

## Required Runtime-Compatibility Checks

Documentation itself has no runtime to check, but verify the *content* is still accurate against:

```bash
npm run runtime:check:changed
```

## Common Risks

- Duplicating a generated inventory (file list, route list, import list, test list, command list, environment consumer list) instead of linking to the live/generated catalog.
- Restating a protected rule instead of linking to it, causing future drift between the two copies.
- Adding YAML front matter or a "last updated" date — machine discovery derives metadata from structure and Git history instead.
- Describing a path, package, command, environment key, runtime, or artifact that does not actually exist in the repository.
- Skipping the update entirely because the code change "seemed too small," when it changed behavior, an API, data, config, architecture, or an operational step.

## Relevant Tests/Checks

```bash
npm run docs:check
npm run architecture:check
```

## Documentation To Update

- The one editable document that owns this topic (do not create a second document for the same topic).
- Cross-links from/to related documents if the change affects how they should be discovered.

## Forbidden Unless Explicitly Requested

- Creating documentation outside `docs/`.
- Writing documentation in a language other than English.
- Editing a protected or generated file to make this update "complete."
