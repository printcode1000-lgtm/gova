# Super Admin Cloud Accounts

## Purpose

`/dev/cloud-accounts` is a read-only reference, development-only.

It lives under `/dev`, not `/super-admin`, and is not in the sidebar. That scope
is what keeps it out of every shipped surface: `app/dev` is excluded from the
static export by `STATIC_ROUTE_IGNORELIST`, so it never reaches the mobile
bundle or `out/`, and the route returns 404 outside development. Under
`/super-admin` it was exported into the mobile bundle, where its `"use client"`
tree pulled `@asol/account-declarations` — whose entries carry
`requiredEnv`/`optionalEnv` — into a static chunk, and
`auditStaticMobilePushSecurity` failed the release over an inventory of server
secret names. It lists
every external account this project deploys to or stores data in: seven Vercel
accounts, five Turso accounts, and four Cloudflare R2 accounts (general,
legacy products, apparel/pets products, OTA).

The page shows account names, project names, login emails, and what each account
holds. It never displays tokens, keys, or secret values.

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
