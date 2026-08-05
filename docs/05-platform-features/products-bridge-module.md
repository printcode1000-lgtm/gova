# Products Bridge Module

The connector between the main app and the products service. It lives in
`src/modules/products-bridge/`, ships in the browser bundle, and runs nowhere
else.

## Why it exists

The main app and the products service are deployed to two different Vercel
accounts, and neither may call the other. Something still has to decide which
one answers a given request. That something is the browser.

```text
                    browser (this module)
                    ╱                    ╲
        main app ──╱                      ╲── products service
   writes, everything else                    product reads
```

## What it does

`buildAsolApiUrl(route, method)` asks the bridge for an origin. The bridge
returns the products service only when **all** of these hold:

1. It is running in a browser.
2. The method is `GET`.
3. The path is one the products service serves.

Otherwise it returns `null`, meaning "leave it alone — the main app answers".

Hooking URL construction rather than each caller means no feature has to know
the split exists. `productApiService.get(...)` is unchanged.

## Rules it follows

**Reads only.** A redirected write would reach an account with no profile
credentials, and product writes rewrite profile counts. The method check is the
whole guard, and the contract test pins it.

**Browser only.** Every entry point returns `null` when `window` is undefined.
This is not an optimisation — it is what prevents server-side rendering from
turning into a main-app-to-products-account call.

**No credentials.** Requests go out with `credentials: "omit"`, as all ASOL API
calls do. The products endpoints are public reads.

**An explicit route list, not a prefix match.** `/api/search/sellers` looks like
a product route and is not one: it reads the profile shards. A prefix rule would
have swept it up and broken seller search on an account that cannot serve it.

## Configuration

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_ASOL_PRODUCTS_URL` | main app, client-safe | Origin of the products service. Empty means every request goes to the main app. |

Empty is a safe default, not a broken one: the main app still serves the product
routes, so an unconfigured bridge degrades to the pre-split behaviour rather
than failing.

A static export or native shell has no same-origin fallback, so
`scripts/build-static.ts` resolves this from `CAPACITOR_PRODUCTS_BASE_URL`,
asserts it is absolute, and bakes it in.

## Difference from the notification bridge

The two connectors solve the same structural problem and behave differently,
because what crosses the boundary differs:

| | Notification bridge | Products bridge |
|---|---|---|
| Direction | main app → service | browser → service |
| Payload | a signed grant | an ordinary read request |
| Timing | fire and forget, after the response | in the request path |
| Failure | notification lost, silently | request fails like any API call |
| Authorisation | the grant's signature | none needed; reads are public |

The notification bridge carries an authorisation the main app already made. The
products bridge carries nothing — it only chooses an address.

## Files

```text
src/modules/products-bridge/
├── index.ts                    # public surface
└── products-bridge.client.ts   # route table + browser guard

src/core/api/asol-api-config.ts # calls the bridge when building each URL
```

See also [Products Service Module](products-service-module.md) and
[Notification Bridge Module](notification-bridge-module.md).
