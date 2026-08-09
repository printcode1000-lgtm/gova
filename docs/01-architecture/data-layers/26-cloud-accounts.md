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
| Cloudflare R2 | 2 | 2 buckets |

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

`system-ops` is split out of the same `profile.db` source as the profile shards
but **did not move to hesham105**: it holds operational records, not profile
data.

### hesham102 — notifications

`asol-notifications` · 3 tables — `user_notification_tokens`,
`user_notification_preferences`, plus drizzle bookkeeping.

Push traffic is one provider request per device token — the burstiest workload
in the system, isolated so it can never consume the quota that serves logins.

`user_notification_tokens.uid` links logically to `users.uid`, but they sit on
different accounts, so **nothing may JOIN them**. `BroadcastRecipientRepository`
reads tokens first, then looks up only those uids and merges in memory.

### hesham103 — products

`asol-products` · 8 tables — `products`, product reviews and replies, pharmacy
profile overrides.

Catalogue listing and search are the highest-volume queries in the system.

### hesham104 — 9 order shards

`orders-core` (2) · `orders-items` (3) · `orders-fulfillment` (2) ·
`orders-delivery-plans` (7) · `orders-shipping-quotes` (1) · `orders-payments`
(1) · `orders-refunds` (1) · `orders-after-sales` (6) · `orders-disputes-audit`
(3).

Only `GET /api/orders` moved to the service. The detail view enriches an order
with profile contacts and store details, and a write spans several shards plus
the profile and product databases — splitting that across accounts would turn
one operation into several that can fail half-done.

### hesham105 — 7 profile shards

`profile-core` (2) · `profile-contact` (3) · `profile-media` (1) ·
`profile-social` (4) · `profile-catalog` (4) · `profile-promotions` (2) ·
`profile-fulfillment` (1).

### One table, one database

**No application table exists in more than one database.** Verified across all
21: 70 distinct application tables, zero overlap.

`__drizzle_migrations` is the one name appearing in four databases. It is
drizzle's own record of applied migrations, holds no application data, and is
excluded from the rule by design.

See [11. Current Databases](./11-current-databases.md).

---

## Cloudflare R2 — two accounts

| | General | Products |
|---|---|---|
| Variables | `R2_*` | `PRODUCT_R2_*` |
| Account | `8486fdbb…3e043` | `166409f3…d3e08` |
| Bucket | `pic1` | `gova-storage` |
| Provider id | `CloudflareR2` | `CloudflareR2Products` |

### What decides where a file goes

`src/config/storage-profiles.json`, and nothing else:

| Profile | Account | Cloud folder |
|---|---|---|
| `avatar` | general | `images/profile/avatars` |
| `cover` | general | `images/profile/covers` |
| `home-hero-slider` | general | `images/content/advertisements/…` |
| `spicialOrder` | general | `images/content/spicialOrder` |
| `product-default` | **products** | `images/products` |

Exactly one profile may point at the product account, and a contract test
asserts that list **equals** `["product-default"]`.

In development neither account is used: `resolveStorageProvider` returns
`LocalStorage` regardless of the profile.

### Current contents

| Bucket | Objects | Size |
|---|---:|---:|
| `pic1` (general) | 3,467 OTA + profile images | ~61 MB |
| `gova-storage` (products) | 4 | 0.63 MB |

The general bucket also carries OTA releases: the current manifest and file
tree, three history entries, and the current release's transport bundles.

The products bucket holds product images **plus two deliberate exceptions** —
`app-updates/manifest.json` and `app-updates/revocations.json`. The store-built
shell has the old manifest URL compiled in, so those two documents are mirrored
there until a store release built against the current origin has rolled out.
Everything else still downloads from the general account.

### Reading an image is not an account operation

`R2_API_TOKEN` and `PRODUCT_R2_API_TOKEN` create buckets and write CORS policy.
Turning a key into a URL is string work and an existence check needs only the S3
pair, so the read paths take the narrow accessors — and neither `asol-products`
nor `asol-profiles` holds an API token.

See [R2 Storage Accounts](../../05-platform-features/r2-storage-accounts.md).

---

## Where the credentials live

Nothing here is a secret store. Every value is an environment variable:

| Scope | Variables |
|---|---|
| Turso runtime | `TURSO_*_DATABASE_URL` / `_AUTH_TOKEN`, per-shard `<SHARD>_DATABASE_*` |
| Turso platform | `TURSO_*_API_TOKEN`, `TURSO_*_ORGANIZATION` — scripts only |
| Vercel | `VERCEL_TOKEN`, `VERCEL_NOTIFICATIONS_TOKEN`, `VERCEL_PRODUCTS_TOKEN`, `VERCEL_ORDERS_TOKEN`, `VERCEL_PROFILES_TOKEN` |
| R2 | `R2_*`, `PRODUCT_R2_*`, and `ASOL_OTA_LEGACY_R2_*` for the mirror |
| Client-safe origins | `NEXT_PUBLIC_ASOL_{NOTIFICATIONS,PRODUCTS,ORDERS,PROFILES}_URL` |

`npm run db:push:vercel-env` pushes the server-side set to the `gova` project.
Each service deploy script pushes only what that account needs.

**A fallback that crosses an account boundary is not a default — it is a silent
redirect.** OTA once fell back from `ASOL_OTA_R2_*` to `PRODUCT_R2_*`, and 3,463
release objects accumulated on the account reserved for product images. Every
such chain has been removed; a missing value now fails loudly.
