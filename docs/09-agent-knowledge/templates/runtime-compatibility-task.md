# Runtime Compatibility Task

Use whenever a change is release-relevant across the five application surfaces, or whenever `runtime:check*` output needs to be interpreted or extended. Read [Runtime Compatibility Contract](../contracts/runtime-compatibility.md) first.

## Context Pack Target Example

```bash
npx tsx scripts/docs/context.ts next.config.ts
```

## Docs To Read

- `docs/09-agent-knowledge/runtime-contract.md`
- `docs/09-agent-knowledge/contracts/runtime-compatibility.md`
- `docs/07-mobile-and-release/deployment-targets.md` (protected — read-only)

## Protected Docs May Be Touched?

**No**, unless the task explicitly changes the five-surface topology itself (`runtime-contract.md`) or deployment-target policy — then use [Protected Doc Change Task](./protected-doc-change-task.md) with authorization.

## Runtime Surfaces To Evaluate

All five, always: Development, Web, Static `out/`, Android, iOS. See the Context Pack's "Required Runtime-Compatibility Test Plan" section for the target-specific subset that is release-relevant vs. dev-only.

## Required Runtime-Compatibility Checks

```bash
npm run runtime:check:changed
npm run runtime:check
npm run runtime:check:dev
npm run runtime:check:web
npm run runtime:check:static
npm run runtime:check:android
npm run runtime:check:ios
```

## Common Risks

- Treating a passing `runtime:check:web` as proof the change also works in Static `out/`/Android/iOS.
- Running `npm run build:static` merely to "check" instead of using `runtime:check:static` — it overwrites the release `out/` bundle.
- Treating a "no direct runtime edges found" warning as proof of no impact instead of an evidence gap to inspect.

## Relevant Tests/Checks

```bash
npm run typecheck
npm run lint
npm run architecture:check
npm run runtime:check
```

Use `npm run build` for the full server/web release gate when the change is release-relevant.

## Documentation To Update

The editable document for the affected feature/domain, describing the concrete runtime implication per [Authoring Standard](../authoring-standard.md) § "Runtime Writing Rule". Do not duplicate the runtime-contract matrix.

## Forbidden Unless Explicitly Requested

- Running `npm run build:static` as a generic check.
- Deploy/OTA publish/store release.
- Browser/preview/computer-use verification.
