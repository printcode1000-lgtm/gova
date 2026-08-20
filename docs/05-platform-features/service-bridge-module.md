# Service Bridge Module

The connector between the main app and the read-only service deployments. It
is implemented in `@asol/account-bridge` (door `.`), ships in the browser bundle, and runs nowhere
else.

The application used to import it through a one-line re-export at `src/modules/service-bridge/`.
That shim is gone: a second name for a package door makes the seal harder to read and buys
nothing. Import `@asol/account-bridge` directly.

## Why it exists

Each deployed module runs on its own Vercel account, and none of them may call
another. Something still has to decide which one answers a given request. That
something is the browser.

```text
                    browser (this module)
              ╱───────────────┼───────────────╲
      main app                │                products / orders services
 writes, everything else                        the reads they own
```

## What it does

`buildAsolApiUrl(route, method)` asks the bridge for an origin. The bridge
returns a service only when **all** of these hold:

1. It is running in a browser.
2. It is not a `next dev` development build.
3. The method is `GET`.
4. The path is one that service owns.

Otherwise it returns `null`, meaning "leave it alone — the main app answers".

Hooking URL construction rather than each caller means no feature has to know
the split exists. The product and order client services are unchanged.

## The route table

| Path | Served by |
|---|---|
| `/api/products` | products |
| `/api/products/reviews` | products |
| `/api/search/products` | products |
| `/api/search/fields` | products |
| `/api/pharmacy-profile-catalog` | products |
| `/api/orders` | orders |
| `/api/profile/contacts` | profiles |
| `/api/profile/store-details` | profiles |
| `/api/profile/specialties` | profiles |
| `/api/profile/fulfillment-settings` | profiles |
| `/api/profile/users-by-specialty` | profiles |

**Exact paths, not prefixes.** Two absences are deliberate, and a prefix rule
would have swallowed both:

- `/api/orders/<id>` — the detail view enriches the order with profile contacts,
  fulfilment settings, and store details. The orders account cannot read those.
- `/api/search/sellers` — despite the name it searches the profile shards, not
  products.
- `/api/profile/reviews` and `/api/profile/discounts` — both read the product
  database as well as the profile shards.

## Rules it follows

**Reads only.** Every write touches data the read services have no credentials
for: product writes rewrite profile counts, order writes span nine shards plus
the profile and product databases. A redirected write would reach a deployment
that cannot finish it.

**Browser only.** Every entry point returns `null` when `window` is undefined.
This is not an optimisation — it is what stops server-side rendering from
turning into a main-app-to-service call.

**One dataset in local development.** A `next dev` browser stays on the local
Business API even when service origins exist in `.env`. The local API reads and
writes the SQLite development databases; redirecting only its reads to a
deployed service mixes local and cloud data and produces false `notFound`
responses. Production web, static, and Capacitor builds are unaffected because
they are production builds. This distinction must use the build mode, not a
`localhost` hostname check, because a Capacitor WebView commonly has a
localhost origin too.

**No credentials.** Requests carry `credentials: "omit"`, as all ASOL API calls
do. These endpoints are public reads.

**One table, not one module per service.** The routing rule is identical for
every service; a second copy would be a place for the two to drift.

## Configuration

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_ASOL_PRODUCTS_URL` | Origin of the products service |
| `NEXT_PUBLIC_ASOL_ORDERS_URL` | Origin of the orders service |
| `NEXT_PUBLIC_ASOL_PROFILES_URL` | Origin of the profiles service |

Empty is a safe default, not a broken one: the main app still serves every one
of these routes, so an unconfigured bridge degrades to pre-split behaviour.

Development builds deliberately behave like the empty-origin fallback even
when these values are configured: all reads remain on the local API so they see
the same SQLite records as writes.

A static export or native shell has no same-origin fallback, so
`scripts/build-static.ts` resolves both from `platform/capacitor.defaults.ts`,
asserts they are absolute, and bakes them in.

## Difference from the notification bridge

Two connectors solve the same structural problem and behave differently, because
what crosses the boundary differs:

| | Notification bridge | Service bridge |
|---|---|---|
| Direction | main app → service | browser → service |
| Payload | a signed grant | an ordinary read request |
| Timing | fire and forget, after the response | in the request path |
| Failure | notification lost, silently | request fails like any API call |
| Authorisation | the grant's signature | none needed; reads are public |

The notification bridge carries an authorisation the main app already made. This
one carries nothing — it only chooses an address.

## Files

```text
@asol/account-bridge/
├── index.ts                   # public surface
└── service-bridge.client.ts   # route table + browser and method guards

src/core/api/asol-api-config.ts # calls the bridge when building each URL
```

Enforced by the products and orders module contract tests, which both assert the
`GET`-only and browser-only guards are present.

See also [Products Service Module](products-service-module.md),
[Orders Service Module](orders-service-module.md),
[Profiles Service Module](profiles-service-module.md), and
[Notification Bridge Module](notification-bridge-module.md).
