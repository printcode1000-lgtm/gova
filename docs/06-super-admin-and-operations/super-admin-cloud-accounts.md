# Super Admin Cloud Accounts

## Purpose

`/dev/cloud-accounts` is a read-only reference, development-only.

It lives under `/dev`, not `/super-admin`, and is not in the sidebar; it is
reached from the floating developer badge menu (`DeveloperBadge`), which lists
the `/dev` routes in development only. That scope
is what keeps it out of every shipped surface: `app/dev` is excluded from the
static export by `STATIC_ROUTE_IGNORELIST`, so it never reaches the mobile
bundle or `out/`, and the route returns 404 outside development. Under
`/super-admin` it was exported into the mobile bundle, where its `"use client"`
tree pulled `@asol/account-declarations` — whose entries carry
`requiredEnv`/`optionalEnv` — into a static chunk, and
`auditStaticMobilePushSecurity` failed the release over an inventory of server
secret names. It lists
every external account this project deploys to or stores data in: eight Vercel
accounts, five Turso accounts, and four Cloudflare R2 accounts (general,
legacy products, apparel/pets products, OTA).

The page is exported from `@/features/super-admin` (the `.` door), not
`@/features/super-admin/ui`. The UI door is imported by the root layout for the
impersonation banner; keeping cloud-accounts off that barrel prevents the env
inventory from shipping in every static chunk after a barrel re-export.

The page shows account names, project names, login emails, and what each account
holds. It never displays tokens, keys, or secret values.

The Turso table also shows a local usage snapshot: rows-read percentage, rows
read, rows-written percentage, rows written, storage usage, embedded sync usage,
database count, locations, groups, and capture time. Runtime code must not call
the Turso Platform API because `TURSO_API_TOKEN` stays tooling-only, so the page
reads only the generated safe snapshot in
`cloud-accounts-turso-usage-snapshot.ts`. Refresh the snapshot locally with
`npm run cloud-accounts:turso-usage`; the generated file contains numbers and
status text only, never token values or database URLs.

The Vercel table follows the same snapshot model. `npm run
cloud-accounts:vercel-usage` reads the declared Vercel tokens locally and asks
`@asol/vercel-deploy-core` to perform the Vercel REST reads for API rate-limit
headers and FOCUS billing charges. The tooling script only summarizes those
package-owned results and writes `cloud-accounts-vercel-usage-snapshot.ts`; it
must not call `api.vercel.com` directly. The page also renders the default plan
limits used for quick operational checks: edge requests, Fast Data Transfer,
deployments per day, builds per hour, projects, runtime-log retention, and
function duration. Vercel tokens never enter the client bundle.

Cloudflare R2 usage is also snapshot-only. `npm run cloud-accounts:r2-usage`
uses each R2 account id, bucket name, and local API token to query Cloudflare
GraphQL Analytics for the current month. The generated
`cloud-accounts-r2-usage-snapshot.ts` stores only safe usage numbers and status
text: Class A operations against the 1M/month free allotment, Class B operations
against the 10M/month free allotment, total storage against the 10 GB-month free
allotment, object count, upload count, and capture time. If a token lacks
GraphQL Analytics permission, the page shows the allowed limit with an explicit
unavailable status instead of guessing.

The route is `force-dynamic`. Account tables are **derived at runtime** from sealed
packages so the page stays aligned with declarations rather than a second hardcoded
copy:

| Provider | Source of truth |
|---|---|
| Vercel | `@asol/account-declarations` via `listVercelCloudAccounts()` |
| Cloudflare R2 | `@asol/storage-core` `getAllStorageAccounts()` plus explicit OTA column |
| Turso | `TURSO_CLOUD_ACCOUNTS` in `cloud-accounts-reference.ts` (no Turso registry package) |

Counts the page states about itself are asked for, never restated. The
at-a-glance row uses `cloudAccountsGlance()`, and a section title naming a
shard count uses `tursoDatabaseCount(account)` rather than a literal — three
titles carried their own copy of a number this reference already held, which
drifts the first time a shard is added. `tursoDatabaseCount` throws on an
unknown account, so a renamed account fails loudly instead of rendering a
silent zero.

Arabic display labels (`serves`, Vercel login nicknames) live beside those lists in
`src/features/super-admin/presentation/cloud-accounts-reference.ts`. Adding a Vercel
or R2 account in a package without updating that file fails `npm run test:cloud-accounts`.

## Workload accounts (`submain`, `sub2main`)

| Account | Email | Project | Role | Deploy |
|---|---|---|---|---|
| `submain` | `groupstenderximages@gmail.com` | `asol-submain` | Search, cart checkout, order creation (`/api/search/*`, `POST /api/orders/from-cart`, `POST /api/orders/custom-request-from-profile`) | `npm run submain:deploy` |
| `sub2main` | `tenderx.engineer100@gmail.com` | `asol-sub2main` | Seller writes: product mutations, profile updates, image uploads, pharmacy catalog | `npm run sub2main:deploy` |

Both deploy from `services/<name>/` via CLI (never GitHub-linked). The browser
bridge routes matching API calls; no server-to-server calls between accounts.
Runtime credentials are scoped per account — see
`packages/account-declarations/src/accounts/submain.ts` and `sub2main.ts`.

To recreate a project from scratch:

```bash
npm run submain:recreate-vercel-project
npm run sub2main:recreate-vercel-project
```

## Source of truth

| Layer | Location |
|---|---|
| Super Admin UI shell | `src/features/super-admin/presentation/SuperAdminCloudAccountsPage.tsx` |
| Cloud accounts page layout | `src/features/super-admin/presentation/SuperAdminCloudAccountsContent.tsx` |
| Derived account tables | `src/features/super-admin/presentation/cloud-accounts-reference.ts` |
| Architecture reference | [26-cloud-accounts.md](../06-super-admin-and-operations/cloud-accounts-architecture.md) |
| Deploy commands | [16-deployment-targets.md](../07-mobile-and-release/deployment-targets.md), [22-scripts-and-workflows.md](../07-mobile-and-release/scripts-and-workflows.md) |
| Environment variables | [14-environment-variables.md](../02-data-and-storage/environment-variables.md) (`VERCEL_SUBMAIN_TOKEN`, `VERCEL_SUB2MAIN_TOKEN`) |
| Account declarations | `packages/account-declarations/src/accounts/*.ts` |

When account layout, emails, or deploy flows change, update the sealed package
declaration (or Turso rows in `cloud-accounts-reference.ts`) and the matching
`docs/` files in the same change. Do not hardcode a parallel Vercel/R2 table in
the page component.

## Access

Visible only when `isSuperAdmin(session)` is true. Linked from the super admin
sidebar group **البيانات والنسخ الاحتياطي** → **حسابات التخزين السحابي** (see
[app-sidebar-navigation.md](../04-ui-components/app-sidebar-navigation.md)).
