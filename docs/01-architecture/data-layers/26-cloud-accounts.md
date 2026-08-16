# Cloud Accounts

Every external account this project deploys to or stores data in, what it is
for, and what is actually inside it.

Verified live against each provider's API. No token, key, or secret appears
here — see [14. Environment Variables](./14-environment-variables.md) for which
variable carries what.

## At a glance

| Provider | Accounts | Holds |
|---|---:|---|
| Vercel | 5 | one deployment each |
| Turso | 5 | 21 databases, 70 application tables |
| Cloudflare R2 | 3 | 3 buckets |

The number five is not a coincidence: **one Vercel account per deployment, and
its data on its own Turso account.** A busy catalogue cannot consume the quota
that serves logins, and a push storm cannot consume either.

---

## Vercel — five accounts

| Account | Project | Serves | GitHub | Updated by |
|---|---|---|---|---|
| `hesham-101` | `gova` | everything not listed below: all writes, `GET /api/orders/:id`, profile reviews and discounts, the super-admin console | **connected** — every push redeploys | pushing to GitHub |
| `101-0902` | `asol-notifications` | push fan-out only | not connected | `npm run notifications:deploy` |
| products account | `asol-products` | product reads | not connected | `npm run products:deploy` |
| orders account | `asol-orders` | `GET /api/orders` (the list only) | not connected | `npm run orders:deploy` |
| profiles account | `asol-profiles` | five profile reads | not connected | `npm run profiles:deploy` |

### The rule that makes this work

**No deployment may call another.** None holds another's URL, and none has a
code path to one. Every crossing goes through a bridge module that is deployed
to no account at all — it runs in the user's browser:

```text
                          browser
        ╱───────────────────┼───────────────────╲
       ╱                    │                    ╲
  gova ◄── service-bridge ──┼──► asol-products
       ╲                    │    asol-orders
        ╲                   │    asol-profiles
         ╲── notification-bridge ──► asol-notifications
```

Only `gova` is connected to GitHub. The other four are updated exclusively by a
terminal command that uploads one folder — `services/<name>/` — and nothing
else in the repository leaves the machine.

See [16. Deployment Targets](./16-deployment-targets.md),
[Service Bridge Module](../../05-platform-features/service-bridge-module.md),
and [Notification Bridge Module](../../05-platform-features/notification-bridge-module.md).

---

## Turso — five accounts, 21 databases

| Account | Databases | Domain | Read by |
|---|---:|---|---|
| `hesham101` | 3 | users and auth, advertisements, system operations | `gova` |
| `hesham102` | 1 | notifications | `gova` + `asol-notifications` |
| `hesham103` | 1 | products | `gova` + `asol-products` |
| `hesham104` | 9 | marketplace order shards | `gova` + `asol-orders` |
| `hesham105` | 7 | profile shards | `gova` + `asol-profiles` |

`gova` holds every credential, because writes and server-side reads cross
domains. Each read-only deployment holds **only** the shards it serves.

### hesham101 — 3 databases

| Database | Tables | Contents |
|---|---:|---|
| `allusers` | 6 | `users`, password recovery, feature flags, OTA releases and audit |
| `advertisements` | 4 | hero slider, featured marquee, trending ribbon |
| `system-ops` | 9 | `system_logs`, `data_health_*` |

### hesham102 — notifications

`asol-notifications` · 3 tables — `user_notification_tokens`,
`user_notification_preferences`, plus drizzle bookkeeping.

### hesham103 — products

`asol-products` · 8 tables — `products`, product reviews and replies, pharmacy
profile overrides.

### hesham104 — 9 marketplace order shards

`asol-orders` · 17 tables across 9 databases.

| Shard | Tables | Contents |
|---|---:|---|
| `orders-core` | 1 | `orders` |
| `orders-items` | 1 | `order_items` |
| `orders-fulfillment` | 1 | `order_fulfillment` |
| `orders-delivery-plans` | 1 | `order_delivery_plans` |
| `orders-shipping-quotes` | 1 | `order_shipping_quotes` |
| `orders-payments` | 1 | `order_payments` |
| `orders-refunds` | 1 | `order_refunds` |
| `orders-after-sales` | 1 | `order_after_sales` |
| `orders-disputes-audit` | 1 | `order_disputes_audit` |

### hesham105 — 7 profile shards

`asol-profiles` · 33 tables across 7 databases.

| Shard | Tables | Contents |
|---|---:|---|
| `profile-core` | 7 | profiles, ratings, verification |
| `profile-contact` | 7 | phones, emails, addresses |
| `profile-media` | 3 | galleries, avatars, covers |
| `profile-social` | 4 | links, handles, platforms |
| `profile-catalog` | 4 | services, categories |
| `profile-promotions` | 4 | offers, discounts, coupons |
| `profile-fulfillment` | 4 | delivery zones, working hours |

---

## Cloudflare R2 — three accounts

| | General | Products | OTA Updates |
|---|---|---|---|
| Variables | `R2_*` | `PRODUCT_R2_*` | `ASOL_OTA_R2_*` |
| Account ID | `8486fdbb…3e043` | `166409f3…d3e08` | `21fce63d…1810` |
| Bucket | `pic1` | `gova-storage` | `ota` |
| Target / Provider | `CloudflareR2` | `CloudflareR2Products` | `ota` (in `R2_STORAGE_TARGETS`) |
| Public Base URL | `https://pub-91c79e3f34ed4575b997fd68ac8dd278.r2.dev` | `https://pub-e1fa9cec1a694b118840c7c2ebc1633b.r2.dev` | `https://pub-ee70bc6c84c54d9b8a8ba44c6f7820a9.r2.dev` |

### What decides where a file goes

`src/config/storage-profiles.json` routes application images:

| Profile | Account | Cloud folder |
|---|---|---|
| `avatar` | general | `images/profile/avatars` |
| `cover` | general | `images/profile/covers` |
| `home-hero-slider` | general | `images/content/advertisements/…` |
| `spicialOrder` | general | `images/content/spicialOrder` |
| `product-default` | **products** | `images/products` |

OTA release storage is governed solely by `@asol/ota-core` targeting the dedicated `ota` bucket (`ASOL_OTA_R2_*`).

### Current contents

| Bucket | Objects | Size | Contents |
|---|---:|---:|---|
| `pic1` (general) | 8 | 0.82 MB | Profile images (avatars, covers), advertising banners, special orders |
| `gova-storage` (products) | 2 | 0.05 MB | Product catalog images only (`images/products/...`) |
| `ota` (OTA releases) | 2,251 | 54.15 MB | Live release `0.2.4.1` (`manifest.json`, file tree, transport bundle) |

The general and product buckets hold zero OTA objects; `images/` objects in both buckets remain 100% intact. OTA release artefacts are completely isolated in the `ota` bucket.

### Reading an image is not an account operation

`R2_API_TOKEN`, `PRODUCT_R2_API_TOKEN`, and `ASOL_OTA_R2_API_TOKEN` create buckets and manage CORS policy. Turning a key into a URL is string work and an existence check needs only the S3 pair, so the read paths take the narrow accessors — and neither `asol-products` nor `asol-profiles` holds an API token.

See [R2 Storage Accounts](../../05-platform-features/r2-storage-accounts.md).

---

## Where the credentials live

Nothing here is a secret store. Every value is an environment variable:

| Scope | Variables |
|---|---|
| Turso runtime | `TURSO_*_DATABASE_URL` / `_AUTH_TOKEN`, per-shard `<SHARD>_DATABASE_*` |
| Turso platform | `TURSO_*_API_TOKEN`, `TURSO_*_ORGANIZATION` — scripts only |
| Vercel | `VERCEL_TOKEN`, `VERCEL_NOTIFICATIONS_TOKEN`, `VERCEL_PRODUCTS_TOKEN`, `VERCEL_ORDERS_TOKEN`, `VERCEL_PROFILES_TOKEN` |
| R2 | `R2_*`, `PRODUCT_R2_*`, and `ASOL_OTA_R2_*` for dedicated OTA storage |
| Client-safe origins | `NEXT_PUBLIC_ASOL_{NOTIFICATIONS,PRODUCTS,ORDERS,PROFILES}_URL`, `NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL` |

`npm run db:push:vercel-env` pushes the server-side set to the `gova` project. Each service deploy script pushes only what that account needs.

**A fallback that crosses an account boundary is not a default — it is a silent redirect.** OTA operations read `ASOL_OTA_R2_*` directly with zero fallbacks. Every fallback chain across accounts has been removed.
