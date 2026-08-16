# Notification Bridge Module

The connector between the two backend deployments. It is implemented in
`@asol/account-bridge` (door `./notifications`), re-exported via
`src/modules/notification-bridge/`, ships in the browser bundle, and runs
nowhere else.

## Why it exists

The main app and the notifications service are deployed to two different Vercel
accounts, and neither may call the other. Something still has to connect them.
That something is the browser.

```text
                     browser (this module)
                     ╱                    ╲
        main app ───╱                      ╲─── notifications service
   issues signed grants                     verifies and delivers
```

The main app knows *who* should be notified — it holds the users and orders
databases. The notifications service knows *how* to deliver — it holds the
Firebase and APNs credentials. Neither holds both, and neither has a route to
the other. The bridge carries a signed decision from one to the other.

## What it does

1. Every Business API response passes through `AsolApiClient.parseResponse`,
   which calls `scheduleNotificationGrantDelivery(body)`.
2. If the body carries a `notificationGrants` array, the bridge POSTs those
   grants to `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL/api/notifications/send`.
3. If it does not — which is almost every response — the call is a no-op.

Hooking the transport rather than each caller means no route or component has to
remember to forward anything. Adding a grant to a response is enough.

## Rules it follows

**Background by default.** Ordinary business APIs hand the response to the
caller before delivery is attempted. A push that fails to leave the browser must
never turn a successful order into a failed one, so that default path never
rejects and never blocks. Features whose visible outcome is the notification
itself may opt into manual delivery and inspect the recipient results.

**No credentials.** It sends `credentials: "omit"` and no bearer token. The grant
is the only authority. This is why the service can accept a permissive CORS
origin safely: there is no ambient session to ride on.

**Browser only.** Every entry point returns early when `window` is undefined, so
importing it during SSR or a static export is harmless.

**No business logic.** It reads an opaque string out of one response and posts it
to one URL. It cannot construct a grant, and it cannot alter one — the payload is
signed whole, so any edit invalidates the signature.

## Configuration

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL` | main app, client-safe | Origin of the notifications service. Empty means the bridge delivers nothing. |

A static export or native shell has no same-origin fallback, so
`scripts/build-static.ts` resolves this from `CAPACITOR_NOTIFICATIONS_BASE_URL`,
asserts it is absolute, and bakes it in. Without that assertion a native release
would ship with push silently disabled and no error anywhere to find it.

## The cost this design accepts

Delivery is **best effort**. The browser must still be alive to carry the grant.
A seller who accepts an order and closes the tab immediately leaves the buyer
unnotified, and there is no server-side retry, because the server no longer knows
the service exists.

This is the direct consequence of forbidding backend-to-backend calls. It is
recorded here rather than hidden so the trade is visible when someone asks why a
notification did not arrive.

Specialty-chat request, reply, and receipt actions, plus super-admin broadcasts,
are the deliberate exceptions to the fire-and-forget UI contract: they await
this browser hop and inspect the notifications service's per-recipient result
before reporting success. This prevents `no_tokens` and failed providers from
appearing as successful sends; it does not turn push into guaranteed
operating-system delivery.

Because of it, API responses report what was **granted**, not what was
delivered: `grantedUsers` and `status: "granted"`. Claiming provider acceptance
would be a claim the main app cannot support.

## Enforcement

`notifications-service-module-contract.test.ts` asserts the boundary holds:

- The main app serves no `/api/notifications/send` route.
- The service route calls `sendToUsersLocally`, never a forwarding entry point.
- Nothing under `services/notifications` imports outside its own folder.

`architecture-check.ts` allows `fetch` in exactly two files — the client HTTP
transport and this bridge — so no other module can open a second path between
the deployments.

## Files

```text
src/modules/notification-bridge/
├── index.ts                        # public surface
└── notification-bridge.client.ts   # delivery, browser-guarded

src/features/notifications/domain/notification-grant-envelope.ts   # shared shape
src/features/notifications/services/notification-grant.server.ts   # sign / verify
src/features/notifications/services/notification-grant-collector.server.ts
```

See also [Notification System](notification-system.md) and
[Notifications Service Module](notifications-service-module.md).
