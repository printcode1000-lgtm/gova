# GitHub CI Policy

GitHub Actions is not a project correctness gate. Direct pushes to `main` must
not wait on checks, reviews, pull requests, branch protection, or required
status checks.

## What runs remotely

| Change in the commit | GitHub Actions |
|---|---|
| Code, packages, scripts, configuration, or native trees only | **Nothing.** `git push origin main` completes with no CI. |
| Any path under `docs/**` (alone or mixed with other files) | **Docs workflow only** (`.github/workflows/docs.yml`) |

The docs workflow is path-filtered to `docs/**`. GitHub skips it when that
glob does not match. It runs `npm run docs:check` and must not run lint,
typecheck, tests, `architecture:check`, or any application build.

## What must not exist

- Any other file under `.github/workflows/`
- `pull_request` / `pull_request_target` / `workflow_dispatch` / `schedule` triggers
- Pull-request templates or required PR merge
- Branch protection or a ruleset that requires status checks before updating `main`
- A required status check named `verify` or any other job

`main` remains the only branch. The `main-only` ruleset (if applied) may block
*creation* of other branches; it must exclude `refs/heads/main` so it cannot
delay or reject a push to `main`. Local enforcement is `.githooks/pre-push.d/10-main-only`.

GitHub-managed `pages-build-deployment` is not a file in this repository. Pages
is configured as `build_type: workflow`, so it does not rebuild on an ordinary
`main` push unless a pages workflow is added. Do not add one. Extra CI files
(Travis, Circle, Dependabot, `verify-ci-coverage.ts`, …) are rejected by the
local guard below.

## Local guards (not GitHub CI)

These run on a developer machine as npm scripts. They must never be added as a
`push` workflow that runs for the whole tree:

```bash
npm run github:ci-policy
npx tsx scripts/tests/github-ci-policy.test.ts
npm run architecture:check   # includes the same policy as a preflight
```

Correctness stays local: `npm run lint`, `npm run typecheck`,
`npm run architecture:check`, `npm test`, and `npm run build`.
`deploy:all` preflight is the release gate. Vercel hosted builds prove the
reviewed tree can compile on Vercel; they are not GitHub CI.

## GitHub administration scripts

| Command | Allowed action |
|---|---|
| `npm run github:protect -- --status` | Confirm `main` has no protection (404) |
| `npm run github:protect -- --remove` | Delete leftover protection |
| `npm run github:protect` | **Forbidden** — applying protection is an error |
| `npm run github:block-branches` | Apply the `main-only` creation ruleset (does not constrain `main`) |

Credential: `GITHUB_ADMIN_TOKEN` in `.env.local`. Never print the token.

## Source map

- Workflow: `.github/workflows/docs.yml`
- Policy: `scripts/github-ci-policy.ts`
- Tests: `scripts/tests/github-ci-policy.test.ts`
- Protection script: `scripts/protect-main-branch.ts`
- Branch creation ruleset: `scripts/block-branch-creation.ts`
- Hook: `.githooks/pre-push.d/10-main-only`
