> **Note:** Operational detail relocated here during the 2026-08 architecture reconstruction. Architectural relationships: [docs/01-architecture/](../01-architecture/README.md).

# Cloud Accounts

Every external account this project deploys to or stores data in, what it is
for, and what is actually inside it.

Verified live against each provider's API. No token, key, or secret appears
here — see [14. Environment Variables](../02-data-and-storage/environment-variables.md) for which
variable carries what.

## At a glance

| Provider | Accounts | Holds |
|---|---:|---|
| Vercel | 8 | one deployment each |
| Turso | 5 | 21 databases, 70 application tables |
| Cloudflare R2 | 4 | 4 buckets |

The number eight is not a coincidence: **one Vercel account per deployment.**
`gova` is the only GitHub-linked project and is now a frontend: pages, static
assets, `/.well-known/**`, `/api/health`, and a stateless compatibility redirect
boundary. `control` is the operational runtime — Super Admin server operations,
System Logs, OTA administration, build and release jobs, and production
deployment authority. The remaining six are the isolated workload services
(including `submain` for search/cart/orders and `sub2main` for seller writes).

Control is deliberately not one of the six. It holds deployment authority over
them, so a command that deploys "all services" must not be able to redeploy the
runtime performing the deploy — which is why `npm run control:deploy` is its own
command and control never appears in a six-workload array.

Each read-only microservice holds data on its own Turso account; workload
accounts hold only the credentials their routes need, and `gova` now holds none
of them. See [The control runtime](control-runtime.md).

---

## Vercel — eight accounts

| Account | Email | Project | Serves | GitHub | Updated by |
|---|---|---|---|---|---|
| `hesham-101` | `print.code.1000@gmail.com` | `gova` | frontend, static assets, `/.well-known/**`, `/api/health`, and the compatibility redirect boundary. No Business API. | **connected** — every push redeploys | pushing to GitHub |
| `asol-control` | `tenderxcontractors@gmail.com` | `asol-control` | Super Admin server operations, System Logs, OTA administration, build/release jobs, production deployment authority, Vercel Sandbox orchestration, callbacks, release readiness | not connected | `npm run control:deploy` |
| `submain` | `groupstenderximages@gmail.com` | `asol-submain` | search (`/api/search/*`), cart checkout, order creation (`POST /api/orders/from-cart`, `POST /api/orders/custom-request-from-profile`) | not connected | `npm run submain:deploy` |
| `sub2main` | `tenderx.engineer100@gmail.com` | `asol-sub2main` | seller writes: product mutations, profile updates, storage uploads, pharmacy catalog | not connected | `npm run sub2main:deploy` |
| `101-0902` | `bs.bid.story@gmail.com` | `asol-notifications` | push fan-out only | not connected | `npm run notifications:deploy` |
| products account | `gnagnahesham@gmail.com` | `asol-products` | product reads | not connected | `npm run products:deploy` |
| orders account | `tenderx10@gmail.com` | `asol-orders` | `GET /api/orders` (the list only) | not connected | `npm run orders:deploy` |
| profiles account | `hesham10125@gmail.com` | `asol-profiles` | five profile reads | not connected | `npm run profiles:deploy` |

## Every account names its owner

An account id identifies a tenant. It does not say who can sign in and issue a new
token when the current one is revoked, which is the thing you need at the moment
something breaks. So every account in all three tables above carries an email, and
adding one without an email is made to fail rather than trusted to be remembered:

| Provider | Declared in | Enforced by |
|---|---|---|
| Vercel | `AccountDeclaration.email` in `@asol/account-declarations` | `typecheck` — `TS2741: Property 'email' is missing` |
| Cloudflare R2 | `StorageAccountDefinition.email` in `@asol/storage-core` | `typecheck`, plus `registerStorageAccount` at runtime |
| Turso | this table and the super-admin page | `npm run test:cloud-accounts` |

Turso is the weak one, and deliberately so rather than by oversight: its five
accounts are Turso *organizations* reached through `TURSO_*_ORGANIZATION` and
`TURSO_*_API_TOKEN`, with no registry object anywhere in the tree to attach a field
to. Inventing one to hold a single string would be a package that exists to satisfy
a test.

`npm run test:cloud-accounts` covers all three anyway, and it is also what makes
updating the reference mandatory rather than customary. The page renders from
`cloud-accounts-reference.ts` (Vercel from `ACCOUNT_DECLARATIONS`, R2 from
`getAllStorageAccounts()` plus explicit OTA, Turso from `TURSO_CLOUD_ACCOUNTS`).
The test fails when:

- a Vercel declaration is missing from `listVercelCloudAccounts()`, or its email /
  project disagrees with the declaration;
- an R2 registry email is missing from `listR2CloudAccounts()`, or OTA is dropped;
- a Turso row lacks a valid email or database count;
- glance counts disagree with those lists.

It runs inside `npm test` and `npm run build`. The route is `force-dynamic`.

The page lists one R2 account the registry does not — OTA is routed through
`R2_STORAGE_TARGETS` rather than the account registry — so the R2 comparison is
"at least", while Vercel's is exact.

### The rule that makes this work

**No deployment may call another.** None holds another's URL, and none has a
code path to one. Every crossing goes through a bridge module that is deployed
to no account at all — it runs in the user's browser:

```text
                          browser
        ╱───────────────────┼───────────────────╲
       ╱                    │                    ╲
  gova ◄── service-bridge ──┼──► asol-products
       ╲  (@asol/account    │    asol-orders
        ╲  -bridge)         │    asol-profiles
         ╲── notification-bridge ──► asol-notifications
         ╲── account-bridge ──► asol-submain   (search, cart, orders)
          ╲── account-bridge ──► asol-sub2main (seller writes, uploads)
```

Only `gova` is connected to GitHub. All six other accounts deploy from
`services/<name>/` via terminal commands — never via a Git repository link.
CLI deploy metadata uses `asolDeployment*` keys only; `githubCommit*` metadata is
reserved for the GitHub-linked `gova` project so CLI full-app deploys cannot appear on
the repository's Deployments tab.

The Vercel CLI also probes the local repository on its own and attaches the last
commit (sha, branch, message, remote URL) to every upload, which the dashboard
renders as a GitHub source row such as `Source: main f1c85e4` even for projects
with no Git link. `runVercel` blocks that probe by pointing `GIT_DIR` at a path
that cannot exist, so CLI deploys of `submain`, `sub2main`, and the four service accounts are
uploaded without commit data and show no source row.

To rebuild a secondary full app from scratch:

```bash
npm run submain:recreate-vercel-project
npm run sub2main:recreate-vercel-project
```

Each command deletes the existing Vercel project (and any legacy short name) after
removing any Git link, creates a fresh GitHub-free project, syncs runtime env
vars, and deploys.

Each service command uploads one folder — `services/<name>/` — and nothing else in
the repository leaves the machine.

### Sealed Capability Packages

The 8 Vercel runtime architecture is enforced and driven by sealed capability
packages under `packages/`:

1. **`@asol/account-declarations`** (`packages/account-declarations/`): The names-only account declarations for `gova`, `control`, and the six workload runtimes, including project names, token variable names, service directories, and per-runtime environment ownership.
2. **`@asol/vercel-deploy-core`** (`packages/vercel-deploy-core/`): GitHub-free project creation (`POST /v10/projects`), credential upserting, the pinned Vercel CLI runner (`vercel@59.0.0`), deployment monitoring, exact-SHA release state, and rollback.
2. **`@asol/service-mirror-core`** (`packages/service-mirror-core/`): Shared import-graph mirror walker that builds `generated/src` and `generated/public` for the four read-only microservices while keeping baseline files byte-identical.
3. **`@asol/account-bridge`** (`packages/account-bridge/`): Pure route+method ownership registry plus the device-side inter-account channel. New clients use owner origins directly, and gova's compatibility boundary uses the same registry for stateless redirects.
4. **`@asol/notifications-composition`** (`packages/notifications-composition/`): Composition layer re-exporting entry points for `asol-notifications`.
5. **`@asol/products-composition`** (`packages/products-composition/`): Composition layer re-exporting entry points for `asol-products`.
6. **`@asol/orders-composition`** (`packages/orders-composition/`): Composition layer re-exporting entry points for `asol-orders`.
7. **`@asol/profiles-composition`** (`packages/profiles-composition/`): Composition layer re-exporting entry points for `asol-profiles`.
8. **`@asol/control-composition`** (`packages/control-composition/`): Composition layer for the operational control runtime.
9. **`@asol/gova-deployment-core`** (`packages/gova-deployment-core/`): Deterministic gova-only build view and post-build artifact gates that prove Business API handlers are absent from the frontend artifact.

See [16. Deployment Targets](../07-mobile-and-release/deployment-targets.md),
[Service Bridge Module](../05-platform-features/service-bridge-module.md),
and [Notification Bridge Module](../05-platform-features/notification-bridge-module.md).

---

## Turso — five accounts, 21 databases

| Account | Email | Databases | Domain | Read by |
|---|---|---:|---|---|
| `hesham101` | `print.code.1000@gmail.com` | 3 | users and auth, advertisements, system operations | `gova` + `submain` + `sub2main` |
| `hesham102` | `bs.bid.story@gmail.com` | 1 | notifications | `gova` + `asol-notifications` |
| `hesham103` | `gnagnahesham@gmail.com` | 1 | products | `gova` + `asol-products` + `sub2main` |
| `hesham104` | `tenderx10@gmail.com` | 9 | marketplace order shards | `gova` + `asol-orders` + `submain` |
| `hesham105` | `hesham10125@gmail.com` | 7 | profile shards | `gova` + `asol-profiles` + `sub2main` |

`gova` and `submain` hold the full application runtime credentials. `sub2main`
holds product, profile-shard, users, and R2 credentials for seller writes. Each
read-only deployment holds **only** the shards it serves.

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

## Cloudflare R2 — four accounts

| | General | Products (legacy) | Apparel + Pets | OTA Updates |
|---|---|---|---|---|
| Variables | `R2_*` | `PRODUCT_R2_*` | `APPAREL_PETS_R2_*` | `ASOL_OTA_R2_*` |
| Account ID | `8486fdbb…3e043` | `166409f3…d3e08` | `f08cd5b7…f2642` | `21fce63d…1810` |
| Email | `print.code.1000@gmail.com` | `bids.stories@gmail.com` | `hesham.gaber@gmail.com` | `tenderx.engineer100@gmail.com` |
| Bucket | `pic1` | `gova-storage` | `productcat1` | `ota` |
| Target / Provider | `CloudflareR2` | `CloudflareR2Products` | `CloudflareR2_products-apparel-pets` | `ota` (in `R2_STORAGE_TARGETS`) |
| Public Base URL | `https://pub-91c79e3f34ed4575b997fd68ac8dd278.r2.dev` | `https://pub-e1fa9cec1a694b118840c7c2ebc1633b.r2.dev` | `https://pub-de6cc53c347e4e6fa0dea7b79bd0ce3e.r2.dev` | `https://pub-ee70bc6c84c54d9b8a8ba44c6f7820a9.r2.dev` |

### What decides where a file goes

`packages/storage-core/src/config/storage-profiles.json` routes application images:

| Profile | Account | Cloud folder |
|---|---|---|
| `avatar` | general | `images/profile/avatars` |
| `cover` | general | `images/profile/covers` |
| `home-hero-slider` | general | `images/content/advertisements/…` |
| `spicialOrder` | general | `images/content/spicialOrder` |
| `product-default` | **products** | `images/products` |
| `product-apparel-pets` | **products-apparel-pets** | `images/products-apparel-pets` |

New product uploads choose a profile via `resolveProductStorageProfileId(scope)`:
catalog ids `1` and `12` plus onboarding fashion slugs go to `product-apparel-pets`;
everything else stays on `product-default`. `products.images_json` may store
optional `storageProfileId`; omission means `product-default`, so pre-split
apparel/pets rows stay on `gova-storage` with no object migration.

OTA release storage is governed solely by `@asol/ota-core` targeting the dedicated `ota` bucket (`ASOL_OTA_R2_*`).

### Current contents

| Bucket | Objects | Size | Contents |
|---|---:|---:|---|
| `pic1` (general) | 8 | 0.82 MB | Profile images (avatars, covers), advertising banners, special orders |
| `gova-storage` (products) | 2 | 0.05 MB | Legacy product catalog images (`images/products/...`) |
| `productcat1` (apparel + pets) | — | — | New apparel/pets product images (`images/products-apparel-pets/...`) |
| `ota` (OTA releases) | 2,251 | 54.15 MB | Live release `0.2.4.1` (`manifest.json`, file tree, transport bundle) |

The general and product buckets hold zero OTA objects; `images/` objects in both buckets remain 100% intact. OTA release artefacts are completely isolated in the `ota` bucket.

### Reading an image is not an account operation

`R2_API_TOKEN`, `PRODUCT_R2_API_TOKEN`, `APPAREL_PETS_R2_API_TOKEN`, and `ASOL_OTA_R2_API_TOKEN` create buckets and manage CORS policy. Turning a key into a URL is string work and an existence check needs only the S3 pair, so the read paths take the narrow accessors — and neither `asol-products` nor `asol-profiles` holds an API token. `asol-products` does receive `APPAREL_PETS_R2_*` public/S3 keys so apparel/pets image URLs resolve.

See [R2 Storage Accounts](../05-platform-features/r2-storage-accounts.md).

---

## Where the credentials live

Nothing here is a secret store. Every value is an environment variable:

| Scope | Variables |
|---|---|
| Turso runtime | `TURSO_*_DATABASE_URL` / `_AUTH_TOKEN`, per-shard `<SHARD>_DATABASE_*` |
| Turso platform | `TURSO_*_API_TOKEN`, `TURSO_*_ORGANIZATION` — scripts only |
| `VERCEL` | `VERCEL_TOKEN`, `VERCEL_SUBMAIN_TOKEN`, `VERCEL_SUB2MAIN_TOKEN`, `VERCEL_NOTIFICATIONS_TOKEN`, `VERCEL_PRODUCTS_TOKEN`, `VERCEL_ORDERS_TOKEN`, `VERCEL_PROFILES_TOKEN` |
| R2 | `R2_*`, `PRODUCT_R2_*`, and `ASOL_OTA_R2_*` for dedicated OTA storage |
| Client-safe origins | `NEXT_PUBLIC_ASOL_{NOTIFICATIONS,PRODUCTS,ORDERS,PROFILES,SUBMAIN,SUB2MAIN}_URL`, `NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL` |

`npm run db:push:vercel-env` pushes the server-side set to the `gova` project.
Each service deploy script (`submain:deploy`, `sub2main:deploy`, and the four
read-only services) syncs only the runtime keys that account needs.

**A fallback that crosses an account boundary is not a default — it is a silent redirect.** OTA operations read `ASOL_OTA_R2_*` directly with zero fallbacks. Every fallback chain across accounts has been removed.
