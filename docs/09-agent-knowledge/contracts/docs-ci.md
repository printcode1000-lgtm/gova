# Docs CI Contract

## Purpose

Defines what `npm run docs:ci` guarantees, when it runs in GitHub Actions, why its scope is deliberately narrow, and what it must never do. Read [GitHub CI Policy](../../07-mobile-and-release/github-ci-policy.md) first — that document is the binding, protected policy for what GitHub Actions may run at all; this document is the documentation-domain detail of the one workflow that policy allows.

## Triggers

GitHub Actions runs the docs workflow (`.github/workflows/docs.yml`) only when a push to `main` touches a path under `docs/**`, alone or mixed with other files. Code, packages, scripts, configuration, and native-tree-only pushes trigger **no** GitHub Actions job.

## Smart Scoping

`docs:ci` is scoped to documentation correctness, not general project correctness:

- it validates the live Knowledge Graph contract, agent-instruction parity, and documentation-domain coverage (`npm run docs:check` / `validateAgentKnowledge()`);
- it validates document-mutability classification and authorization for every changed protected/generated path (`npm run docs:mutability:check`);
- it checks for dead/stale documentation facts — links to files that no longer exist, mentions of npm scripts or `@asol/*` packages that do not exist, editable docs that appear to redefine a protected contract, and required agent-knowledge contracts/templates that are missing.

It must **not** run lint, typecheck, tests, `architecture:check`'s full application-code gates, or any application build. Those stay local, per [GitHub CI Policy](../../07-mobile-and-release/github-ci-policy.md).

## Fail Conditions

`docs:ci` fails the run when any of these is true:

- a `protected` path changed in the diff without `[docs-contract-change]` in the commit message and without `DOCS_CONTRACT_CHANGE=1`/`true`;
- a `generated` path changed by hand instead of through its generator (detected via regenerate-and-diff);
- the document-mutability registry itself is malformed (missing required protected entries, duplicate class/path pairs, a path that does not exist, an invalid class);
- a required agent-knowledge entry point or agent instruction marker is missing;
- the live Knowledge Graph contract is violated (missing mandatory node/edge classes, dangling edges, missing five-runtime nodes, a server route wrongly mapped to a static/native runtime, a document with no domain assignment, environment-assignment redaction leaking a value);
- a dead-docs finding of kind `missing-file`, `missing-package`, `missing-command`, `stale-link`, `protected-redefinition`, `missing-contract`, `missing-generated`, or `missing-runtime-compat-doc` is present.

## Allowed Commands Inside the Workflow

The workflow installs the lockfile with lifecycle scripts disabled (`npm ci --ignore-scripts`) and runs exactly:

```bash
npm run docs:check
```

`npm run docs:ci` is the superset an agent runs **locally** before pushing (it composes `docs:check`, `docs:mutability:check`, and the dead-docs validation); the committed workflow itself stays limited to the single entry point above so the GitHub-side surface area matches [GitHub CI Policy](../../07-mobile-and-release/github-ci-policy.md) exactly. Do not add a second workflow file, a `pull_request`/`schedule`/`workflow_dispatch` trigger, or branch protection — those are forbidden regardless of how documentation-related they look.

## What Docs CI Must Never Do

- **No deploy.** No Vercel deployment, no `deploy:all` phase, no environment promotion.
- **No OTA.** No `@asol/ota-core` publish, no store-facing artifact upload.
- **No database operation.** No schema sync, no migration, no seed/reset against Turso or any database.
- **No browser/computer-use verification.** Documentation correctness is validated by static analysis of the repository graph and registries, never by rendering pages or driving a browser.
- **No application build.** `next build`, `build:static`, native Android/iOS builds are out of scope for this workflow.

If a documentation change appears to need one of these to "prove" correctness, that is a signal the change actually needs a local, non-CI verification step (see [Runtime Compatibility Contract](./runtime-compatibility.md) for the safe non-publishing checks an agent runs by hand instead).

## Verification

Run locally before pushing anything under `docs/**`:

```bash
npm run docs:check
npm run docs:mutability:check
npm run docs:ci
npm run architecture:check
```

## Related Documents

- [GitHub CI Policy](../../07-mobile-and-release/github-ci-policy.md) — protected, binding policy for all of GitHub Actions.
- [Document Mutability](../document-mutability.md)
- [Documentation Update Policy](./documentation-update-policy.md)
- [Docs CI Task](../templates/docs-ci-task.md)
