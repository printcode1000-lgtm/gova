# Editable Doc Change Task

Use for the normal case: a change to behavior, an API/data contract, configuration, runtime compatibility, or an operational step that must update the matching editable document in the same change. See [Documentation Update Policy](../contracts/documentation-update-policy.md).

## Context Pack Target Example

```bash
npx tsx scripts/docs/context.ts src/features/<feature>
```

## Docs To Read

- `docs/09-agent-knowledge/contracts/documentation-update-policy.md`
- `docs/09-agent-knowledge/domain-registry.json` (find the owning editable domain)
- The existing editable document that already owns the topic, if any.

## Protected Docs May Be Touched?

**No.** Editable feature work never needs a protected-path edit. If it feels like it does, re-scope per [Protected Docs](../contracts/protected-docs.md) § "What To Do Instead", or use [Protected Doc Change Task](./protected-doc-change-task.md) only when the task explicitly calls for a contract change.

## Runtime Surfaces To Evaluate

Whatever the underlying code change affects — state it explicitly per [Authoring Standard](../authoring-standard.md) § "Runtime Writing Rule" rather than describing only "the website".

## Required Runtime-Compatibility Checks

```bash
npm run runtime:check:changed
```

Add the specific per-surface command(s) the Context Pack's runtime test plan requires for the target.

## Common Risks

- Creating a new document when an existing editable document already owns the topic (duplicate/parallel inventory).
- Copying a generated fact list by hand instead of linking to the live/generated catalog.
- Describing only the web path for shared client code that also reaches Static `out/`/Android/iOS.

## Relevant Tests/Checks

```bash
npm run docs:check
npm run docs:mutability:check
npm run docs:ci
```

## Documentation To Update

The editable document under the domain that owns the change (see `domain-registry.json`). This is the only class this template authorizes — do not touch protected or generated paths.

## Forbidden Unless Explicitly Requested

- Editing any protected document.
- Hand-editing anything under `docs/09-agent-knowledge/generated/`.
- Browser/preview/computer-use verification.
