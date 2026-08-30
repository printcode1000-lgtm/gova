# GitHub CI Policy

GitHub Actions is not a general application correctness gate. Direct pushes to
`main` must not wait on reviews, pull requests, branch protection, or required
status checks. Every push dispatches production deployment of that exact
revision; this is release orchestration, not correctness CI.

## What runs remotely

| Change in the commit | GitHub Actions |
|---|---|
| Every push to `main` | **Deploy workflow** (`.github/workflows/deploy-main.yml`) |
| Documentation, agent instruction surfaces, docs/knowledge/runtime tooling, or related package manifests listed below | **Docs workflow** (`.github/workflows/docs.yml`) in addition to deploy |
| Explicit local-agent patch dispatch | **Local agent workflow** (`.github/workflows/local-agent-main.yml`) |
| Explicit parallel agent workspace dispatch | **Local agent workspace workflow** (`.github/workflows/local-agent-workspace.yml`) |

Both workflows prefer the repository self-hosted runner labeled `gova`
(`runs-on: [self-hosted, Linux, X64, gova]`). A selector job first runs on
GitHub-hosted infrastructure, checks the repository runner list, and retries for
up to twelve 30-second checks. Only when the local `gova` runner is still not
online and idle does the workflow fall back to GitHub-hosted execution. The
runner lives outside the live developer checkout so GitHub Actions can create
and clean its own `_work` checkout without mutating `/home/hesham/gova`.
The selector is the only step allowed to read `GOVA_RUNNER_STATUS_TOKEN`; it is
used only to call the GitHub runner-status API.

The deploy workflow has one job and one action (`actions/github-script@v7`). It
checks out no source and runs no shell command. Its deploy step receives no
GitHub deployment secret: the OIDC token is accepted only for this repository,
the `push` event, `main`, the fixed workflow path, and the pushed commit SHA.
The API runs `deploy:revision` inside the existing isolated Vercel Sandbox,
deploys all six isolated accounts, and verifies the GitHub-linked main project
at the same SHA. It never commits or pushes. The job polls to a terminal result
and reports deployment failure.

The docs workflow triggers on `push` and `pull_request` to `main` with an
explicit positive path filter covering:

- `docs/**`
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`
- `.agents/**`
- `scripts/docs/**`, `scripts/architecture/**`, `scripts/architecture-check.ts`
- `scripts/runtime/**`, `scripts/github-ci-policy.ts`
- `package.json`, `package-lock.json`
- `.github/workflows/docs.yml`

It installs the lockfile with lifecycle scripts disabled, runs
`npm run docs:ci` and `npm run runtime:check`, and must not run lint,
typecheck, full application tests, `architecture:check`, deploy, OTA publish,
destructive database commands, or any application build.

`docs:ci` is smart/scoped: editable-doc-only changes can take a lighter path;
protected/generated/tooling/runtime-contract changes run the full documentation
and knowledge validation suite.

The local agent workflows are the only manually dispatched workflows. They run
only on the `gova` self-hosted runner pool, accept a base64-encoded git diff plus
a commit message, apply the patch through `scripts/local-agent-main-apply.ts`,
run one allowed verification command, commit the result, and push. The workspace
workflow pushes an isolated `codex/agent-*` branch for parallel agents. The main
workflow pushes directly to `main` and is serialized by concurrency. Neither
workflow accepts arbitrary shell commands, falls back to GitHub-hosted execution,
or consumes GitHub secrets. Secret-bearing project files are rejected by the
apply script. See [Local Agent Runner Pool](./local-agent-runner-pool.md).

## What must not exist

- Any workflow other than `docs.yml`, `deploy-main.yml`,
  `local-agent-main.yml`, and `local-agent-workspace.yml`
- Any execution job that does not prefer the `gova` self-hosted runner before
  GitHub-hosted fallback
- Any GitHub secret except `GOVA_RUNNER_STATUS_TOKEN` in the runner selector
- `pull_request_target` / `schedule` triggers
- `workflow_dispatch` outside the local agent workflows
- Pull-request templates or required PR merge
- Branch protection or any active rule that can reject or delay an update to `main`
- A required status check named `verify` or any other job that blocks `main`

`pull_request` is allowed only as a docs-aware informational workflow for the
same path filter. It must not become a required status check.

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
general `push` workflow that runs for the whole application tree:

```bash
npm run github:ci-policy
npx tsx scripts/tests/github-ci-policy.test.ts
npm run docs:ci
npm run runtime:check
npm run architecture:check   # includes the GitHub CI policy as a preflight
```

Correctness stays local: `npm run lint`, `npm run typecheck`,
`npm run architecture:check`, `npm test`, and `npm run build`.
`deploy:all` preflight is the release gate. Vercel hosted builds prove the
reviewed tree can compile on Vercel; they are not GitHub CI.

## GitHub administration scripts

| Command | Allowed action |
|---|---|
| `npm run github:protect -- --status` | Confirm classic protection is absent and the GitHub branch-rules endpoint reports no active rule that can constrain `main` |
| `npm run github:protect -- --remove` | Delete leftover classic protection, then fail if an active repository/organization/enterprise rule still constrains `main` |
| `npm run github:protect` | **Forbidden** — applying protection is an error |
| `npm run github:block-branches` | Apply the `main-only` creation ruleset (does not constrain `main`) |

Credential: `GITHUB_ADMIN_TOKEN` in `.env.local`. Never print the token.

## Source map

- Workflows: `.github/workflows/docs.yml`, `.github/workflows/deploy-main.yml`
- Policy: `scripts/github-ci-policy.ts`
- Tests: `scripts/tests/github-ci-policy.test.ts`
- Protection script: `scripts/protect-main-branch.ts`
- Branch creation ruleset: `scripts/block-branch-creation.ts`
- Hook: `.githooks/pre-push.d/10-main-only`
- Docs CI: `scripts/docs/docs-ci.ts` via `npm run docs:ci`
- Runtime checks: `scripts/runtime/check.ts` via `npm run runtime:check`
