# A push to `main` produces no Vercel deployment

## Symptom

`deploy:push` deploys control and all six workloads, publishes exact-SHA
readiness, then fails:

```
[deploy:push] FAILED — main deployment is NOT_FOUND:
No production deployment matching this run was found on Vercel.
```

`git ls-remote` confirms the commit is on `origin/main`. Vercel's deployment
list contains **no record at all** for that SHA — not `QUEUED`, not `CANCELED`,
nothing — while deployments for other branches keep appearing.

## What it is not

Each of these was checked and ruled out:

| Suspected | Ruled out by |
| --- | --- |
| The project lost its Git link | `link.type: github`, correct repo, `productionBranch: main`, `gitProviderOptions.createDeployments: enabled`, not paused |
| The `ignoreCommand` skipped the build | A skip records a `CANCELED` deployment — that is exactly what the other branch's pushes produce. No `CANCELED` record exists for the missing SHAs |
| Vercel deduplicated an unchanged tree | The commits changed tracked files. And the opposite case deployed fine: an `--allow-empty` commit that changed **nothing** built and reached `READY` |
| Webhooks are broken | Other branches produced deployments continuously throughout the same window |

## What it is

Deployment **contention from a branch that should not exist**.

`CLAUDE.md` recognises exactly two remote branches: `main` and
`agent-request/chatgpt`. A third, `integration`, was being pushed roughly every
fifteen minutes. Every one of those pushes creates a deployment that the
`ignoreCommand` then cancels — real deployment records, competing for the same
project.

The correlation is exact:

| Time | Branch activity | `main` deployment |
| --- | --- | --- |
| 06:45 | quiet | created, `READY` |
| 07:02 | `integration` churning | **none** |
| 09:5x | `integration` churning | **none** |
| 10:28 | quiet | created, `BUILDING` |

`main` deploys when the project is quiet and is lost when the third branch is
churning. Vercel's internal reason for dropping the event is not visible through
the API; the correlation is, and it is the actionable fact.

## What to do

1. **Remove the unauthorised branch.** `npm run github:block-branches` installs
   the GitHub ruleset that refuses creation of any ref except the two recognised
   branches. It deliberately excludes `refs/heads/main`, so it can never delay a
   release push. Deleting the existing `integration` branch is a separate,
   deliberate act — something is actively pushing to it, and that writer should
   be stopped first.
2. **Re-run `deploy:push`.** The failure is safe by construction: the release
   fails closed, the readiness it published is withdrawn, and the previous
   production deployment keeps serving.

## Why the failure is safe

A missing frontend deployment used to be the dangerous case: the seven backends
were `READY` at the new SHA and readiness stayed `ready`, so a build that arrived
late — after the rollback re-promoted the previous backends — would publish a
frontend over backends from a different SHA.

The transaction now withdraws the readiness before it rolls anything back, and
an explicit failure outranks a derived readiness permanently for that revision.
See `docs/07-mobile-and-release/release-commands.md` § "Why the order is the
contract".

That retraction needed two halves, and shipping only the first taught the lesson
this whole troubleshooting section keeps repeating: the callback logged
`readiness withdrawn` while the barrier kept answering `ready`, because the
durable status was derived from components that had all passed. **A log line
saying a thing happened is not evidence that it happened.** Read the barrier
back.
