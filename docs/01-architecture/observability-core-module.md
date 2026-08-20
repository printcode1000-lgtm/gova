# `@asol/observability-core`

## Mission

The developer monitor: what the application observed about itself — traces, recorded operations,
and the `/dev/monitor` data model.

It was `src/core/monitor/`: fourteen unsealed files. `@asol/data-core` had already been given a
port to announce its queries through, while the recording half stayed in the application, so one
concern lived on both sides of a seal.

## Doors

| Door | Import | Safe for | Contents |
| :--- | :--- | :--- | :--- |
| `.` | `@asol/observability-core` | Browser and server | Monitor store, API/DB monitors, query observer, `registerMonitorTelemetry`, dev-trace vocabulary |
| `./dev-trace` | `@asol/observability-core/dev-trace` | Anything | The trace header name and its parser — **nothing else** |
| `./server` | `@asol/observability-core/server` | Server only | `runWithDevTrace`, `traceServerLayer`, the drizzle logger, `registerServerMonitorTelemetry` |

### Why three doors

This package is the clearest case in the repository of a door being a **load-time contract**
rather than a convenience barrel:

- `src/core/api/api-response.ts` needs the trace header name and is mirrored into all six service
  deployments. Reaching it through `.` pulled the monitor store and `@asol/data-core/browser`
  behind it — into every one of them. `./dev-trace` has a single type import and no runtime edge.
- `./server` deliberately does **not** re-export `emit-server-trace`: that module reads a trace
  header on the *browser* side and pulls the store with it, so a deployment that wanted only
  `traceServerLayer` would have carried the whole monitor.

Both failures are pinned by the package's contract test, and both were real: `services:sync`
refused the upload until the doors were split.

## The one port

```ts
configureObservabilityCore({ isDevelopment: () => isDevelopment });
```

Every trace and every recorded operation is development-only, and the package must not decide for
itself what "production" means — the application's runtime context knows about static export and
the native container too. Registered from both composition roots
(`src/core/composition/*-ports.ts`).

The default is `process.env.NODE_ENV !== 'production'`: on for a developer, silent in production,
so a forgotten registration costs trace lines rather than leaking traces to users. The contract
test asserts both roots still register it, because that default is safe enough to hide the mistake.

## What it must never do

Import the application. The monitor observes the application; it does not know it. Everything it
needs arrives through the port, and `@asol/data-core` is forbidden from importing this package in
either direction — its own contract test names both doors as inverted.
