# `.vercelignore` contract false failure for wildcarded directories

## Symptom

`npm run test:deployment-tools` fails in `scripts/tests/vercelignore-contract.test.ts` with a message such as:

```text
.vercelignore must exclude non-build payload: docs/01-architecture/02-packages/module-isolation-rules.md
```

The root `.vercelignore` already excludes `/docs/*`, re-opens only `docs/01-architecture/`, excludes that subtree again, and then re-opens only `08-reference/` plus the generated reference files required by `architecture:check`.

## Root cause

The contract test implemented a small `.gitignore`-style matcher. Its wildcard branch treated `*` as matching one path segment but did not model the second part of ignore semantics: a wildcard can match a directory, and when that directory is ignored its descendants are ignored as well.

For example, `/docs/01-architecture/*` matches the directory `docs/01-architecture/02-packages`; therefore files below that directory remain excluded even though `*` itself does not consume `/` characters.

The test incorrectly evaluated only the final file path and returned `false`.

## Fix

`scripts/tests/vercelignore-contract.test.ts` now lets wildcard matches represent an ignored directory and therefore match descendants with `(?:/.*)?` after the wildcard expression.

Do not broaden `.vercelignore` to make this test pass. The upload policy is intentional: only the generated architecture reference files required during the Vercel build are allowed back under `docs/`.

## Verification

Run:

```bash
npm run test:deployment-tools
```

or the focused contract:

```bash
npx tsx scripts/tests/vercelignore-contract.test.ts
```
