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
nothing.

It is intermittent. In one afternoon, two `main` pushes deployed normally and
two produced no record, with no difference in what they changed: one of the
commits that *did* deploy was an `--allow-empty` commit that changed nothing at
all, while both missing ones changed tracked files.

## What it is not

Each of these was checked against the Vercel API and ruled out:

| Suspected | Ruled out by |
| --- | --- |
| The project lost its Git link | `link.type: github`, correct repo, `productionBranch: main`, `gitProviderOptions.createDeployments: enabled`, not paused |
| The `ignoreCommand` skipped the build | A skip still records a `CANCELED` deployment. No record of any state exists for the missing SHAs |
| Vercel deduplicated an unchanged tree | The missing commits changed tracked files, and an empty commit deployed fine — the discriminator is not content |
| Webhooks are broken | Deployments from other branches kept appearing throughout the same window |

## What is not known

**The cause is on Vercel's side and is not visible through the API.** Nothing in
this repository explains it, and no repository change has been made to work
around it.

One correlation was observed — the missing pushes fell in a window when the
`integration` branch was being pushed every few minutes — but it does not
survive scrutiny and **should not be treated as the cause**. `integration` never
deploys: the `ignoreCommand` cancels every one of its deployments by design, so
its records represent builds that never ran and never competed for a publish.
Correlation in time is not evidence of contention.

`integration` is a deliberate branch for local runner work and tests. Nothing is
pushed from it to `main` today, though that may change. It is not the problem and
must not be removed.

## What to do

Re-run `npm run deploy:push`. The failure is transient: the same commit deploys
on a later attempt.

## Why the failure is safe

A missing frontend deployment used to be the dangerous case. The seven backends
were `READY` at the new SHA and the published readiness stayed `ready`, so a
build arriving late — after the rollback re-promoted the previous backends —
would publish a frontend over backends from a different SHA. That is exactly what
happened once, and the topology had to be realigned by hand with an extra
release.

The transaction now withdraws the readiness before it rolls anything back, and an
explicit failure outranks a derived readiness permanently for that revision. A
late build for the failed SHA fails closed, and the previous production
deployment keeps serving. Verified live: the failed revision's barrier reads
`failed` while the deployed revision still reads `ready`.

## Two lessons this cost

**A log line saying a thing happened is not evidence that it happened.** The
first retraction attempt logged `readiness withdrawn` while the barrier kept
answering `ready`: the durable status was *derived* from the components, all of
which had passed, so a derived `ready` came straight back. Only reading the
barrier back exposed it. `test:vercel-deploy-core` now asserts the read, not the
write.

**A correlation is not a cause, and naming one as the cause has a price.** The
first version of this document blamed the `integration` branch and recommended
removing it. That recommendation was wrong twice over: the branch is intentional,
and its deployments never run. A troubleshooting document that names the wrong
cause sends the next reader — human or agent — down the same wrong path with more
confidence than they would have had on their own. Where the cause is unknown,
this document says so.
