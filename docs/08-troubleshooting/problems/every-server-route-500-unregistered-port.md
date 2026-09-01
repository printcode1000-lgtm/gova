# Every server route returns 500: `… is not configured`

## Symptom

Every server route answers `internalServerError`. The server log carries:

```
dataCoreRuntimeConfig: getServerRuntimeContext is not configured
```

with `executionTimeMs: 1` — it fails before doing any work. Meanwhile:

- `/api/health` returns **200**, because it touches no shard;
- `deploy:all` reports every target **READY**;
- `typecheck`, `architecture:check` and the full test suite are **green**.

The application is completely broken and every signal says it is fine.

## Two independent causes, and they hide each other

### 1. One module, two instances

`@asol/data-core`'s runtime-config port kept its registration in module scope:

```ts
let port: DataCoreRuntimeConfigPort = { ...DEFAULTS };
```

A bundler is free to give one source file more than one instance. Next builds
`instrumentation` and each route into separate chunks, and Turbopack did exactly
that. Proven with two probes in a real production build:

```
[PROBE] instrumentation: registering
[PROBE] runtime-config module instance 9vkmq0   <- configured here
[PROBE] instrumentation: done
[PROBE] runtime-config module instance pk0riz   <- routes read here
```

`src/instrumentation.ts` configured one copy; every route handler read the
other, which still held defaults that throw.

**Fix:** key the registration on `globalThis` through `Symbol.for`, so it is the
same value from whichever instance asks. Eight port modules carried this shape;
all were converted.

### 2. The isolated accounts never registered the port at all

The main application registers from `src/instrumentation.ts`. An isolated
service deployment has no application instrumentation, and **none of the six
composition roots registered it**. Every route reaching a repository threw while
`/api/health` stayed 200 — so all six deployed READY and the profiles account
served errors to the browser.

**Fix:** each composition root registers what its account actually reads. See
`repository-architecture-enforcement.md` § "Every deployment is a composition
root".

`submain`'s route files import their composition package, so its module-scope
registration ran on import — which is why it kept working and masked the
problem. `sub2main`'s routes re-export handlers from the mirror and import no
composition, so its registration was dead code. Both now have
`services/<account>/src/instrumentation.ts`.

## Why nothing caught it

No static analysis can see either cause.

Node resolves one path to one module instance, so the duplication exists **only
in a bundled build**. `tsx`-based tests, `typecheck`, `architecture:check`, and
even the `import-without-composition` contract all pass while production is
down.

`deploy:all` built, uploaded and polled Vercel until it answered READY — but
READY means the deployment exists, not that a request succeeds. Nothing in the
repository started a server and asked it a question.

## What now prevents it

| Gate | Runs | Asks |
| --- | --- | --- |
| `smoke:production` | after `build` | five routes on the main app, each crossing a different composition root |
| `smoke:services` | after `services:build` | one route per isolated account that reaches **that account's own data** |
| `control:smoke` | after `control:build` | control's auth boundary **and** one route that reaches control's own shard |
| `architecture:check` | every run | that every `services/<account>` has a composition root, that the root registers the data-core runtime port, and that the service's own sources import it |

Health is deliberately not the probe: the fault leaves health green.

Both scan the server's output as well as the status code, because a route can
answer 200 while a port quietly falls back to a default — any `is not
configured` line fails the check.

That scan only works if the failure is visible. `/api/notifications/send`
returned a silent 400 for a malformed body, a missing credential and an
unregistered port alike, so the gate could not tell them apart; it now logs the
reason before rejecting. See `16-deployment-targets.md` § "What each account is
asked, and why" for what each probe asks and why the obvious probe was wrong for
two of the six accounts.

## A third cause the gate found: the environment picked SQLite

Once the gate ran inside a real `deploy:all`, the profiles account answered
500 on every route reaching data:

```
better-sqlite3 is not available in the notifications service:
this deployment is Turso-only.
```

Two separate faults in one line.

**The message named the wrong account.** Five of the six stubs were
copy-pasted and reported a different service than the one they ran in, which
made a profiles failure read as a notifications problem. Each now names
itself.

**The real fault:** all six isolated accounts alias `better-sqlite3` to a stub
that throws — they never run against local SQLite, and bundling the native
driver would force a native build for unreachable code. But they still let
`resolveServerDatabaseBackend` decide from the environment, and a data source
of `local` selects sqlite. The deployment then loaded a driver it does not
ship.

On Vercel, one misconfigured variable reproduces this exactly: every data
route down, health still green. Same shape as the original outage.

**Fix:** an account that cannot run SQLite must not ask. Each composition root
states its own invariant:

```ts
registerDataCoreRuntimeConfigPorts({ forceRemoteDataSource: true });
```

The general rule: when a deployment physically cannot serve one branch of a
runtime choice, it pins that choice in code. Leaving it to configuration turns
a guaranteed invariant into a variable that can be set wrong.

## A fourth cause: control repeated it, and its gate could not see it

`control` shipped with `registerControlServerPorts()` an empty function body,
nothing calling it, and `@asol/control-composition` absent from the service's
mirror altogether. Every control route that reaches a shard — release state,
System Logs, OTA administration, data health, cloud backup — answered 500,
while the deployment reported READY and `/api/health` stayed 200. The same
shape as the original outage, on the one runtime the release plane depends on.

It surfaced only when the gova build barrier needed it: `deploy:all` deployed
control and the six workloads, then the release-readiness callback answered
`HTTP 500 internalServerError` and the release rolled back. That callback was
the first caller in the repository to ask control a question that touches data.

**Why every gate stayed green** — and this is the part worth remembering:

- `control:smoke`'s probes all asserted an **authorization refusal** (400 / 401
  / 403). Authorization runs before the handler touches a shard, so every probe
  passed against a runtime whose data layer could not start. A gate that only
  proves "the request was rejected" cannot prove "the request could have been
  served".
- `/api/release-readiness/<sha>` **swallowed the exception by design** and
  answered `200 {"status":"pending"}`. The reason is sound — that endpoint is
  unauthenticated and must not leak configuration — but it made a broken store
  indistinguishable from a revision that had not deployed yet.

**Fix:** `@asol/control-composition` registers the runtime-config port with
`forceRemoteDataSource: true`, and `services/control/src/instrumentation.ts`
calls it once per server instance. The six workloads import their composition
from each route; control has one composition and many routes, so it registers
from instrumentation instead.

A third gate was blind in a way worth naming: the isolated-deployment backend
contract skipped any composition root that did not register the port at all —
"a root that reaches no repository has nothing to pin". A root with an empty
body reaches no repository, so `control` passed it. It now requires every
deployed account to have a root, to register, and to be imported by the
service's own sources; a root nothing imports never runs.

**The gate lesson, generalized:** an authorization refusal is evidence that the
identity seam is wired, and evidence of nothing else. Any runtime whose smoke
probes are all rejections is a runtime nobody has actually asked for data. Every
deployment's smoke must include at least one probe that reaches its own storage,
and no probe may be allowed to convert an exception into a healthy-looking
answer.

## If you see this again

1. Read the response body, not just the status: it names the missing port.
2. Reproduce with `npx next build && npx next start`, not `next dev` — the fault
   does not exist in dev.
3. If the port is unconfigured in the main app, look for module duplication:
   log a random id at module scope in the port file and see if it prints twice.
4. If it is unconfigured in one service only, that account's composition root is
   missing the registration.

## What not to do

Do not narrow a package door by rewriting internal imports. An attempt to close
`@asol/data-core`'s `./core` door also moved thirty-nine repository imports from
the barrel to the registry path; that changes which module instance a bundler
returns, and this package's port state is per instance. Narrow the door, leave
the internals alone.

Do not assume a correlated push is the cause. During this incident a healthy
commit was reverted on timing alone, before checking whether production
recovered. It had not, because that commit was never the cause, and the revert
cost time while the real fault stayed live.
