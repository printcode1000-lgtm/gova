# ASOL Control Cutover Handoff for the Next Agent

## Exact instruction to send to the next agent

Continue and complete the ASOL Control atomic cutover from the current `main` branch of `/home/hesham/gova`. First verify that your local `main` is synchronized with `origin/main`, then continue from the committed repository state. Do not use browser tools for verification; use the repository commands, curl/textual evidence, GitHub/Vercel CLI/API output, and exact command results only.

The repository implementation for the control cutover has already been wired and pushed by the previous agent. Your remaining job is production execution and evidence capture:

1. Re-check `git status --short --branch` and `git rev-parse HEAD origin/main`; continue only from the latest intended `origin/main`.
2. Read `AGENTS.md`, `note/asol-control-single-agent-execution-plan.md`, `note/asol-control-execution-checkpoint.md`, and this handoff.
3. Run a narrow sanity sweep before production mutation:
   - `npm run docs:ci`
   - `npm run architecture:check`
   - `npm run test:deployment-tools`
   - `npm run test:release-core`
   - `npm run test:vercel-deploy-core`
4. Before running `npm run deploy:all`, provide the missing local public gova origins that the previous preflight found absent:
   - `NEXT_PUBLIC_ASOL_CONTROL_URL=https://asol-control.vercel.app`
   - `NEXT_PUBLIC_ASOL_SUBMAIN_URL=https://asol-submain.vercel.app`
   - `NEXT_PUBLIC_ASOL_SUB2MAIN_URL=https://asol-sub2main.vercel.app`
   These are public runtime origins, not secrets. Prefer exporting them in the shell for the deployment run instead of editing tracked files.
5. Run the atomic production cutover:
   ```bash
   NEXT_PUBLIC_ASOL_CONTROL_URL=https://asol-control.vercel.app \
   NEXT_PUBLIC_ASOL_SUBMAIN_URL=https://asol-submain.vercel.app \
   NEXT_PUBLIC_ASOL_SUB2MAIN_URL=https://asol-sub2main.vercel.app \
   npm run deploy:all
   ```
6. Let `deploy:all` own the sequence: preflight, secrets backup, Git publish, rollback baseline capture, control deploy, six workload deploys, durable readiness callback, gova build, release check, and deployed smoke.
7. If `deploy:all` fails after production mutation, do not improvise a manual partial recovery first. The script now automatically attempts `rollbackToBaseline()` for all eight runtimes after mutation; capture and report its exact rollback report.
8. If `deploy:all` succeeds, verify and report the exact commit SHA, the eight runtime READY states, the durable release-readiness result, the gova production revision, and `smoke:deployed` output.
9. The final answer may say `ASOL CONTROL CUTOVER COMPLETE` only after the live `deploy:all` succeeds and production smoke passes. If a credential/resource is missing, start with `EXTERNAL BLOCKER` and name the exact missing resource or operation. If it is a repository failure, say so separately.

## What has already been completed

- Current baseline at the start of this stage was `HEAD == origin/main == 1d9d5243fcc2471fc92742bf9009dbcaddc7cdd2`; this was newer than the older plan SHA and was treated as the intended current `main`.
- `deploy:all` now includes a `control` phase after `publish` and before the six workload phases.
- `deploy:all` now includes a `readiness` phase after `sub2main` and before `main`.
- The readiness phase posts a signed callback to control only after control plus all six workload reports are `READY`, publishing the durable exact-SHA release state that `build:vercel` waits on.
- `deploy:all` now captures rollback baselines for all eight runtimes before Git publication and automatically attempts rollback after production mutation failures.
- The Vercel remote/sandbox stage contract now includes `control` and `readiness`.
- `@asol/vercel-deploy-core` now exports release rollback through its package root so `scripts/deploy-all.ts` does not import an internal subpath.
- Account declaration wording now says eight Vercel declarations. The separate `gova` compatibility text that says seven owner origins is intentionally still correct.
- Docs were updated in `docs/06-super-admin-and-operations/control-runtime.md`, `docs/06-super-admin-and-operations/cloud-accounts-architecture.md`, and `docs/06-super-admin-and-operations/super-admin-cloud-accounts.md`; generated knowledge docs were regenerated.

## Verification already run by the previous agent

- `npm run test` passed all 96 gates.
- `npm run verify:all` passed with `41 passed, 0 failed, 0 skipped, 1 omitted`; omitted gate was `ota:self-test` because it writes/deletes a live R2 object and needs the OTA signing key.
- `npm run test:deployment-tools` passed.
- `npm run test:release-core` passed.
- `npm run test:vercel-deploy-core` passed.
- `npm run test:account-declarations` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run docs:generate` completed.
- `npm run docs:ci` passed.
- `npm run architecture:check` passed at 100%; it still reports 167 native surfaces changed since the last store release as non-failing OTA-publish context.
- `npm run control:sync` passed and synced 354 shared modules into `services/control`.
- `npm run control:verify` passed.
- `npm run control:build` passed.
- `npm run control:smoke` passed.
- `npm run gova:tree` passed and produced a gova-only build tree with 1 API route kept and 121 omitted.
- A gova-only Next build inside `.tmp-gova-build` passed.
- `npm run gova:artifact:verify` passed and reported the artifact contains only the health API function with no business capability or secret trace.
- `npm run api:inventory` passed and showed the expected ownership split: `GET /api/health` as `gova/dev`, operational routes as `control`, and business routes owned by their workload runtimes.

## Why the previous agent stopped before live cutover

The user explicitly changed the instruction: write this handoff inside `note/`, push all current work to `main`, and stop. Therefore the previous agent did not continue production deployment after that instruction.

The one attempted `npm run deploy:all` happened before the stop instruction and failed in `preflight` before any production mutation. The failure was:

```text
Required Vercel runtime environment values are missing:
  - gova: NEXT_PUBLIC_ASOL_CONTROL_URL
  - gova: NEXT_PUBLIC_ASOL_SUBMAIN_URL
  - gova: NEXT_PUBLIC_ASOL_SUB2MAIN_URL
```

No production deployment, rollback, alias change, or release-state callback occurred during that failed attempt.

## Notes and cautions

- Do not claim deployment completion from local gates. Live completion requires `npm run deploy:all` success plus deployed smoke.
- Do not manually edit generated docs. Run `npm run docs:generate`.
- Do not edit protected docs such as `docs/07-mobile-and-release/github-ci-policy.md` unless the user explicitly authorizes a `[docs-contract-change]`.
- Do not treat the `architecture:check` native surface report as a failure; the check says it is non-failing context for OTA publish.
- Keep `control` outside `SERVICE_PHASE_IDS`; the workload loops must remain exactly six.
- Keep gova's seven public owner origins separate from the eight Vercel account declarations. The former is a frontend compatibility boundary, the latter is the deployment account registry.
- If the local environment lacks the three public origins again, set them in the shell for the deploy command as shown above.
