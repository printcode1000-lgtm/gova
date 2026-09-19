# Egyptian verification fails with `verificationDispatchFailed`: the owner account never registered the dispatch transport

## Symptom

On `/registration` (and any other verification purpose), requesting a code for an Egyptian `+20` number fails immediately:

```
[Asol][PreAuth][web] send-phone-verification-code failed
ApiError: verificationDispatchFailed
```

No SMS is sent. Non-Egyptian (email) verification is unaffected, `/api/health` is `200`, the deployment is `READY`, and every repository gate is green.

## Cause

`/api/verification/**` is owned by the `submain` account (`packages/account-bridge/src/routes.ts`), not by the main `gova` application. The verification service delivers the SMS gateway wake-up grant through an injected port, `registerVerificationDispatchTransport`, whose unconfigured default answers "not delivered" so that a missing wiring fails closed rather than silently doing nothing.

That port was registered only in the main application's composition root, `src/core/composition/server-application-ports.ts`. The `submain` deployment composes itself through `@asol/submain-composition` and never ran that file, so on the runtime that actually serves the route the transport stayed at its default. The service found the Super Admin's Android registration, built the grant, handed it to a transport that refused it, and reported `verificationDispatchFailed`.

This is the same shape as [owned-route-not-shipped.md](./owned-route-not-shipped.md): ownership lives on one account, wiring lived on another.

## Why every gate stayed green

- The transport fails closed by design, so nothing threw during build or smoke.
- The verification service tests inject a fake dispatcher, which is correct for testing the service but says nothing about which runtime registers the real transport.
- `/api/health` touches no port.

## Fix

- The registration moved into one shared registrar, `registerVerificationDispatchTransportPort()` in `src/features/notifications/ports/verification-dispatch-transport-port.ts`.
- Both composition roots call it: the main application's `registerServerApplicationPorts()` and `@asol/submain-composition` at module load.
- The registrar resolves the notifications origin through `getNotificationsServiceOrigin()` (server env), not `businessApiOrigins()`. The latter imports the inter-account route table, which must never enter an isolated service mirror (`test:account-bridge` Rule 0, T3).

## Regression guard

`npm run test:submain-composition` imports the composition and asserts, behaviourally, that a dispatch transport is present on its shared global key. Removing the registrar call makes that test fail.

## Diagnosing a recurrence

1. Find the route's owner in `packages/account-bridge/src/routes.ts`.
2. Confirm that owner's composition root (`packages/<owner>-composition/src/index.ts`) calls every registrar the route's service depends on — a port registered only in `src/core/composition/` does not exist on an isolated account.
