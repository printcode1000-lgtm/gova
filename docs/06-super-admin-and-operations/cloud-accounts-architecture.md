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

The Account column is the team slug Vercel reports for each token (`resolveTeamSummary`); `/dev/cloud-accounts` reads it from Vercel rather than from this table, and so does its Git column (`readProjectGitRepository`).

| Account | Email | Project | Serves | GitHub | Updated by |
|---|---|---|---|---|---|
| `hesham-101` | `print.code.1000@gmail.com` | `gova` | frontend, static assets, `/.well-known/**`, `/api/health`, and the compatibility redirect boundary. No Business API. | not linked; `vercel.json` disables Git deploys | `deploy:all` or `deploy:push:fast` |
| `01026546550` | `tenderxcontractors@gmail.com` | `asol-control` | Super Admin server operations, System Logs, OTA administration, build/release jobs, production deployment authority, Vercel Sandbox orchestration, callbacks, release readiness | not connected | `npm run control:deploy` |
| `283` | `groupstenderximages@gmail.com` | `asol-submain` | search (`/api/search/*`), cart checkout, order creation (`POST /api/orders/from-cart`, `POST /api/orders/custom-request-from-profile`) | not connected | `npm run submain:deploy` |
| `773` | `tenderx.engineer100@gmail.com` | `asol-sub2main` | seller writes: product mutations, profile updates, storage uploads, pharmacy catalog | not connected | `npm run sub2main:deploy` |
| `101-0902` | `bs.bid.story@gmail.com` | `asol-notifications` | push fan-out only | not connected | `npm run notifications:deploy` |
| `87-0bf2` | `gnagnahesham@gmail.com` | `asol-products` | product reads | not connected | `npm run products:deploy` |
| `434-49de` | `tenderx10@gmail.com` | `asol-orders` | `GET /api/orders` (the list only) | not connected | `npm run orders:deploy` |
| `656-1bdb` | `hesham10125@gmail.com` | `asol-profiles` | five profile reads | not connected | `npm run profiles:deploy` |

## Every account names its owner

An account id identifies a tenant. It does not say who can sign in and issue a new
token when the current one is revoked, which is the thing you need at the moment
something breaks. So every account in all three tables above carries an email, and
adding one without an email is made to fail rather than trusted to be remembered:

| Provider | Declared in | Enforced by |
|---|---|---|
| Vercel | `AccountDeclaration.email` in `@asol/account-declarations` | `typecheck` — `TS2741: Property 'email' is missing` |
| Cloudflare R2 | `StorageAccountDefinition.email` in `@asol/storage-core` | `typecheck`, plus `registerStorageAccount` at runtime |
| Cloudflare R2 (OTA) | `OtaR2Target.email` in `@asol/ota-core` | `typecheck` |
| Turso | the Turso API (`readTursoOrganizationIdentity`: the token owner) | `npm run test:cloud-accounts` |

Turso has no registry object, and needs none: its organizations are the
`TURSO_[<SCOPE>_]ORGANIZATION` / `TURSO_[<SCOPE>_]API_TOKEN` pairs in
`.env.example`, each logical database belongs to the organization its configured
URL host names (`<database>-<organization>`), and the token owner's login and the
organization's database list are read from Turso. The Vercel email is also checked
against the token owner Vercel reports.

Turso usage follows the same safe-live pattern as R2 in local development.
After a verified super-admin session, `/dev/cloud-accounts` calls the strict
development-only `GET /api/dev/cloud-accounts/turso-usage` route. The route
keeps every Turso platform token on the server and queries Organization Usage
plus Current Subscription and List Plans. It returns sanitized rows-read,
rows-written, storage, embedded sync, input/output byte totals, database count,
locations, groups, current plan, billing-cycle metadata, and plan quotas only.
The browser never receives organization names from env or platform tokens.

A successful live row replaces the display-time snapshot for that organization.
A missing credential or a Turso API failure affects only that row and falls back
to `cloud-accounts-turso-usage-snapshot.ts`. The manual
`npm run cloud-accounts:turso-usage` command remains the explicit snapshot
writer and operational fallback. The snapshot still uses the Starter/Free
limits, while live rows use the quotas returned for the account's current plan.

`npm run test:cloud-accounts` covers all three anyway, and it is also what makes
updating the reference mandatory rather than customary. The page renders
`CloudAccountsFacts`, which `buildCloudAccountsFacts()` derives per request from
`ACCOUNT_DECLARATIONS`, `ROUTE_OWNERSHIP`, the storage account and profile
registries, the OTA target, the desired-schema manifests, and `package.json`
(see [super-admin-cloud-accounts.md](./super-admin-cloud-accounts.md)). The
suites fail when:

- a Vercel declaration, route owner, storage account, storage profile, or Turso
  database is missing from the facts, or any derived value disagrees with its
  source;
- a Turso row lacks a valid email, or a logical database belongs to no
  organization or to two;
- a command the page names is not a `package.json` script;
- a presentation component paints text of its own instead of the copy module;
- a provider tab stops refreshing its values live on activation.

They run inside `npm test`, which `deploy:all` preflight runs. The route is
`force-dynamic`.

The page lists one R2 account the registry does not — OTA is routed through
`@asol/ota-core` (`OTA_R2_STORAGE_TARGET`) rather than the account registry.

### The rule that makes this work

**No deployment may call another.** None holds another's URL, and none has a
code path to one. Every crossing goes through a bridge module that is deployed
to no account at all — it runs in the user's browser:

```text
browser
  └─ @asol/account-bridge (ROUTE_OWNERSHIP)
       ├─► asol-control
       ├─► asol-notifications
       ├─► asol-submain    (search, cart, orders)
       ├─► asol-orders
       ├─► asol-sub2main   (seller writes, uploads)
       ├─► asol-profiles
       ├─► asol-products
       └─► gova            (/api/health only; /api/:path* → 307 to the owner)
```

`gova` answers no Business API. Its build (`@asol/gova-deployment-core`) keeps
only `GOVA_KEPT_API_ROUTES` (`/api/health`), and `src/proxy.ts` redirects every
owned `/api` route to its owner with 307, answers CORS preflight, and returns 502
`businessApiRouteHasNoOwner` for a business route no account owns.

`/dev/cloud-accounts` draws this picture from `ROUTE_OWNERSHIP`, the gova build
manifest, and `src/proxy.ts` on every load, so the page cannot lag them.

No Vercel project is linked to a Git repository — Vercel reports no Git link for
any of them, `ensureProject` removes one if it appears, and `gova`'s
`vercel.json` also disables Git deployments. `gova` deploys through
`npm run main:deploy` inside the release commands; all other accounts deploy from
`services/<name>/` via terminal commands. The page reads each project's Git link
from Vercel and each deployment's `vercel.json` to state this.
CLI deploy metadata uses `asolDeployment*` keys only; `githubCommit*` metadata is
reserved for the GitHub-linked `gova` project so CLI full-app deploys cannot appear on
the repository's Deployments tab.

Vercel usage refreshes live when the Vercel tab opens, through the strict
development-only `GET /api/dev/cloud-accounts/vercel-usage` route.
`readVercelAccountUsage` summarizes rate-limit headers and FOCUS billing charges
read through `@asol/vercel-deploy-core`; `npm run cloud-accounts:vercel-usage`
uses the same summarizer to write the fallback snapshot. The client page renders
limits and sanitized totals only; it never imports or calls the Vercel API
directly.

Cloudflare R2 usage is intentionally different from the other provider
snapshots: in local development it refreshes live when the Cloudflare tab of
`/dev/cloud-accounts` opens. After the browser has a verified super-admin session it calls the strict
development-only `GET /api/dev/cloud-accounts/r2-usage` route. The route keeps
Cloudflare tokens on the server, delegates the GraphQL transport to
`@asol/storage-core/server`, and returns only safe usage rows. A successful
live row replaces the display-time snapshot for that account; a missing or
under-scoped token falls back to the previous safe snapshot without blocking
other R2 accounts.

`npm run cloud-accounts:r2-usage` remains the explicit snapshot writer. It
queries the same current-month GraphQL data and rewrites
`cloud-accounts-r2-usage-snapshot.ts`. Both live and snapshot paths render
Class A operations, Class B operations, total storage, object count, upload
count, capture time, and the documented free-tier limits.

`npm run cloudflare:r2-analytics:check` verifies that every local R2 API token
can read the GraphQL Analytics dataset needed for Class A and Class B
operations. Passing requires account-scoped Cloudflare permissions `Account
Analytics Read` and `Workers R2 Storage Read` on each of the four R2 accounts.

Bucket contents refresh live on the same tab through
`GET /api/dev/cloud-accounts/r2-contents` (`readCloudflareR2BucketContents` in
`@asol/storage-core/server`), and fall back to a second snapshot:
`npm run cloud-accounts:r2-contents` walks the Cloudflare R2 objects REST list for
every registered R2 account and the explicit OTA bucket. It writes `cloud-accounts-r2-contents-snapshot.ts` with
object counts, byte totals, and latest-object metadata for every bucket. This
keeps "current contents" complete even when GraphQL Analytics is unavailable for
one of the Cloudflare accounts.

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
2. **`@asol/vercel-deploy-core`** (`packages/vercel-deploy-core/`): Sole owner of `api.vercel.com` access, including account/team verification, project and environment management, safe rate-limit and FOCUS billing reads for the development cloud-accounts snapshot, GitHub-free project creation (`POST /v10/projects`), the pinned Vercel CLI runner (`vercel@59.0.0`), deployment monitoring, exact-SHA release state, and rollback. Tooling outside this package consumes semantic functions and never calls the Vercel REST API directly.
3. **`@asol/service-mirror-core`** (`packages/service-mirror-core/`): Shared import-graph mirror walker that builds `generated/src` and `generated/public` for the four read-only microservices while keeping baseline files byte-identical.
4. **`@asol/account-bridge`** (`packages/account-bridge/`): Pure route+method ownership registry plus the device-side inter-account channel. New clients use owner origins directly, and gova's compatibility boundary uses the same registry for stateless redirects.
5. **`@asol/notifications-composition`** (`packages/notifications-composition/`): Composition layer re-exporting entry points for `asol-notifications`.
6. **`@asol/products-composition`** (`packages/products-composition/`): Composition layer re-exporting entry points for `asol-products`.
7. **`@asol/orders-composition`** (`packages/orders-composition/`): Composition layer re-exporting entry points for `asol-orders`.
8. **`@asol/profiles-composition`** (`packages/profiles-composition/`): Composition layer re-exporting entry points for `asol-profiles`.
9. **`@asol/control-composition`** (`packages/control-composition/`): Composition layer for the operational control runtime.
10. **`@asol/gova-deployment-core`** (`packages/gova-deployment-core/`): Deterministic gova-only build view and post-build artifact gates that prove Business API handlers are absent from the frontend artifact.

See [16. Deployment Targets](../07-mobile-and-release/deployment-targets.md),
[Service Bridge Module](../05-platform-features/service-bridge-module.md),
and [Notification Bridge Module](../05-platform-features/notification-bridge-module.md).

---

## Turso — five accounts, 21 databases

| Account | Email | Databases | Domain | Read by |
|---|---|---:|---|---|
| `hesham106` | `tenderx.engineer100@gmail.com` | 3 | users and auth, advertisements, system operations | `gova` + `submain` + `sub2main` + `control` (users/system-ops only) |
| `hesham102` | `bs.bid.story@gmail.com` | 1 | notifications | `gova` + `asol-notifications` |
| `hesham103` | `gnagnahesham@gmail.com` | 1 | products | `gova` + `asol-products` + `sub2main` + `control` (product counts only) |
| `hesham104` | `tenderx10@gmail.com` | 9 | marketplace order shards | `gova` + `asol-orders` + `submain` |
| `hesham105` | `hesham10125@gmail.com` | 7 | profile shards | `gova` + `asol-profiles` + `sub2main` + `control` (`profile-core` only) |

`gova` and `submain` hold the full application runtime credentials. `sub2main`
holds product, profile-shard, users, and R2 credentials for seller writes. Each
read-only deployment holds **only** the shards it serves. `control` has one bounded
cross-domain read for Super Admin user administration: users, `profile-core`, and
product credentials are required so `/api/super-admin/users/search` can combine
identity/specialties with product counts; it does not receive the other profile
shards or workload write credentials.

### hesham106 — 3 databases

| Database | Tables | Contents |
|---|---:|---|
| `allusers` | 5 | `users`, password recovery, feature flags, OTA releases and audit |
| `advertisements` | 3 | hero slider, featured marquee, trending ribbon |
| `system-ops` | 2 | `system_logs`, `control_release_state` |

### hesham102 — notifications

`asol-notifications` · 3 tables — `user_notification_tokens`,
`user_notification_preferences`, plus query builder bookkeeping.

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
| Target / Provider | `CloudflareR2` | `CloudflareR2Products` | `CloudflareR2_products-apparel-pets` | `@asol/ota-core` (`OTA_R2_STORAGE_TARGET`) |
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

### Local Cloudflare control CLI

`npm run cloudflare:control` is the local Cloudflare operator entrypoint. It is
tooling-only, uses `@asol/storage-core` plus the explicit OTA account for its
account catalog, and reads tokens from `.env.local` through the shared env-file
reader. It exposes safe account/token/R2 listing commands plus an advanced
`api:request` escape hatch for Cloudflare REST endpoints. That escape hatch
still requires an account selector, replaces `{account_id}` from the selected
account, redacts secret-looking fields in output, and refuses write methods
without `--confirm`.

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
