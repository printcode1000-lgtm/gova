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
every external account this project deploys to or stores data in: every Vercel
account declaration, every Turso organization, and every Cloudflare R2 account
(the storage registry plus the OTA bucket). The page states no count of its own;
every number is computed from those lists.

The page is exported from `@/features/super-admin` (the `.` door), not
`@/features/super-admin/ui`. The UI door is imported by the root layout for the
impersonation banner; keeping cloud-accounts off that barrel prevents the env
inventory from shipping in every static chunk after a barrel re-export.

The page shows account names, project names, login emails, and what each account
holds. It never displays tokens, keys, or secret values.

The client layout groups the same read-only reference into four tabs: a general
summary, Vercel accounts, Turso accounts, and Cloudflare accounts. The tabs only
organize presentation; provider data sources, live-safe refresh routes, and
snapshot fallbacks remain unchanged.

The Turso tab refreshes live in local development whenever that provider tab is
selected. After the super-admin session is verified, the client calls the strict
development-only `GET /api/dev/cloud-accounts/turso-usage` endpoint. The server
reads each organization/token pair locally, calls Turso Organization Usage,
Current Subscription, and List Plans, and returns safe usage numbers only. The
display includes rows read/written, storage, embedded sync, input/output bytes,
database count, locations, groups, plan name, real plan quotas, and capture
time. A successful live row overrides the snapshot for that account; a missing
or failing credential falls back to the last safe snapshot without blocking the
other Turso organizations.

`npm run cloud-accounts:turso-usage` remains the manual snapshot refresh. The
generated `cloud-accounts-turso-usage-snapshot.ts` contains numbers and status
text only, never platform tokens, database URLs, or organization credentials.
Turso platform tokens remain server-only and are never returned by the live
endpoint.

The Vercel tab refreshes live in local development whenever it is selected.
After the super-admin session is verified, the client calls the strict
development-only `GET /api/dev/cloud-accounts/vercel-usage` endpoint. The server
reads each declaration's token locally and summarizes API rate-limit headers and
FOCUS billing charges with `readVercelAccountUsage`
(`server/services/cloud-accounts-vercel-usage.ts`), which asks
`@asol/vercel-deploy-core` for every Vercel REST read. `npm run
cloud-accounts:vercel-usage` uses the same summarizer to write
`cloud-accounts-vercel-usage-snapshot.ts`, so live rows and the snapshot cannot
disagree about what a reading means; neither calls `api.vercel.com` directly. A
successful live row replaces the snapshot for that account; a failed one keeps
the snapshot and states the failure. Each row also carries what Vercel reports
about the account itself — the team slug (`resolveTeamSummary`), its billing
plan, the token owner's login, and the project's Git link
(`readProjectGitRepository`) — so none of those is written by hand; a token owner
that differs from the declared email is flagged. Hobby teams can authenticate
successfully and still return 404 for Billing/Usage data; in that case the table
keeps API rate-limit proof and omits unsupported per-metric usage rows. Vercel
tokens never enter the client bundle.

Cloudflare R2 usage refreshes live in local development whenever the Cloudflare
tab is selected. After the super-admin session is verified, the client calls the
strict development-only `GET /api/dev/cloud-accounts/r2-usage` endpoint. That
server route reads each account's local token, queries Cloudflare GraphQL
Analytics for the current month, and returns safe numbers only. A successful
live row overrides the committed snapshot; an account whose token is missing or
lacks Analytics permission keeps its last safe snapshot instead of blanking the
whole table.

`npm run cloud-accounts:r2-usage` remains the manual snapshot refresh. The
generated `cloud-accounts-r2-usage-snapshot.ts` stores Class A operations
against the 1M/month free allotment, Class B operations against the 10M/month
free allotment, total storage against the 10 GB-month free allotment, object
count, upload count, capture time, and safe status text. API tokens stay
server-side and are never returned by the live endpoint.

Before refreshing Class A / Class B usage, run `npm run
cloudflare:r2-analytics:check`. Every R2 account token must be scoped to its
own account and include Cloudflare account permissions `Account Analytics Read`
and `Workers R2 Storage Read`; otherwise Cloudflare GraphQL returns `not
authorized for that account` even when ordinary R2 object listing works.

The "current bucket contents" rows also refresh live when the Cloudflare tab is
selected, through the strict development-only
`GET /api/dev/cloud-accounts/r2-contents` endpoint. It lists each bucket with
`readCloudflareR2BucketContents` from `@asol/storage-core/server` (Cloudflare's
R2 objects REST listing) and returns object counts, byte totals, and the newest
key only. `npm run cloud-accounts:r2-contents` remains the snapshot writer for
`cloud-accounts-r2-contents-snapshot.ts`. Contents are intentionally separate
from GraphQL usage because an account may permit R2 object listing while
denying GraphQL Analytics; each read falls back to its own snapshot.

`npm run cloudflare:control` is the local operator CLI for direct Cloudflare
control. It uses the same R2 account list that backs `/dev/cloud-accounts`,
reads only local env var names such as `R2_API_TOKEN` and
`ASOL_OTA_R2_API_TOKEN`, and never prints token values. The CLI can list known
accounts, verify a token, list R2 buckets and objects, delete an object, or send
an advanced Cloudflare REST request through `api:request`. Its reach is exactly
the reach of the selected Cloudflare API token; Cloudflare permissions are not
bypassed. Mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) are refused
unless the command includes `--confirm`.

## Every painted fact is derived

The route is `force-dynamic` and calls `buildCloudAccountsFacts()`
(`src/features/super-admin/server/services/cloud-accounts-facts.ts`, exposed
through `@/features/super-admin/server`) inside the request. The client receives
the resulting `CloudAccountsFacts` as props and renders it; it imports no
registry and restates no fact. A fact that can no longer be derived — a renamed
script, a storage profile whose provider resolves to no account, a missing
snapshot row — throws on the server instead of rendering a stale sentence.

| Fact on the page | Derived from |
| --- | --- |
| Vercel accounts, projects, emails, service directories | `@asol/account-declarations` |
| Routes each account answers; the bridge diagram | `ROUTE_OWNERSHIP` in `@asol/account-bridge/routes` |
| What `gova` answers (its own collapsible group in "مسارات كل حساب") | the routes `govaDeploymentManifest()` keeps, and the matcher, redirect status, and unowned-route status/error read from `src/proxy.ts` |
| Deploy command per account | the `*:deploy` script in `package.json` whose last argument is the account name or whose script file imports that account's declaration |
| Automatic Git deployment | `git.deploymentEnabled` in the deployment's own `vercel.json` |
| Turso organizations | the `TURSO_[<SCOPE>_]ORGANIZATION` / `API_TOKEN` pairs in `.env.example`, named by their values |
| Turso databases per organization and their tables | each logical database's configured URL host (`<database>-<organization>`) and the desired-schema manifests (`@asol/data-core/provisioning`); a URL naming no organization is listed as unassigned |
| Turso token owner and the databases that exist in Turso | the Turso API (`readTursoOrganizationIdentity`), on tab open and in the snapshot |
| Vercel team slug, plan, token owner, project Git link | the Vercel API through `@asol/vercel-deploy-core`, on tab open and in the snapshot |
| OTA bucket, owner, env prefix | `OTA_R2_STORAGE_TARGET` in `@asol/ota-core` |
| Local secrets file ignored by Git; the project `db:push:vercel-env` reconciles; the isolation rule | `git check-ignore`; the declaration its script imports; the `account-bridge-contract` check |
| Which deployment reads each database | declarations whose `requiredEnv`/`optionalEnv` contain that database's credential keys (`credentialKeysFor`) |
| R2 accounts, buckets, URLs, env prefixes, provider ids | `@asol/storage-core` registry and `R2AccountProvider`; OTA from `OTA_R2_STORAGE_TARGET` |
| Where each file is written | storage profiles (`getAllStorageProfiles`) and the OTA prefix (`getOtaPrefix`) |
| Local secrets file, package names, npm commands, routing-catalog path | `CANONICAL_LOCAL_ENV_FILE`, workspace `package.json` names, root `package.json` scripts, the generated catalog path (checked to exist) |
| Usage numbers | live provider reads on tab open, falling back to the generated snapshots |

No hand-written account table remains: every identity is either declared in the
package that owns it or read from the provider.

Wording lives once in `presentation/cloud-accounts-copy.ts`; every number,
name, command, path, and package inside it is a parameter taken from the facts.
The tab components (`CloudAccounts*Tab.tsx`), the shell, and the primitives paint
no text of their own.

## Refresh model

- **Page load:** facts are re-derived per request.
- **Tab open:** `CLOUD_ACCOUNTS_LIVE_SOURCES` in
  `use-cloud-accounts-live-usage.ts` names the live reads each tab issues —
  Vercel usage, Turso usage, R2 usage plus R2 contents — and they re-run on every
  activation with `cache: "no-store"` and `networkAuthoritative` reads. The
  general tab shows derived facts only.

## Tests

`npm run test:cloud-accounts` runs four suites, and it is part of the generated
`npm run test` gate that `deploy:all` preflight runs:

- `cloud-accounts-emails.test.ts` — every account has an owner email, every
  business API route appears under its owner, and the presentation components
  contain no Arabic copy and no literal JSX text.
- `cloud-accounts-dynamic-binding.test.ts` — every fact equals the registry,
  manifest, or file that owns it; changing a fact changes the painted wording;
  every tab renders every derived fact; a live reading replaces the snapshot and
  a failed one is reported; a database follows its configured URL to its
  organization; provider identities appear only in the generated snapshots; and
  every configured Turso database exists in the organization Turso reports.
- `cloud-accounts-gova-boundary.test.ts` — the stated `gova` routes equal the
  build manifest, and the real proxy redirects every owned pattern and answers an
  unowned route with exactly the status and error the page states.
- `cloud-accounts-live-refresh.test.ts` — the route is per-request, every tab
  declares live reads for every provider value it shows, each read has a strict
  development-only super-admin route, reads re-run on every activation, and all
  three suites stay reachable from the `deploy:all` test gate.

## Workload accounts (`submain`, `sub2main`)

| Account    | Email                           | Project         | Role                                                                                                                                  | Deploy                    |
| ---------- | ------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `submain`  | `groupstenderximages@gmail.com` | `asol-submain`  | Search, cart checkout, order creation (`/api/search/*`, `POST /api/orders/from-cart`, `POST /api/orders/custom-request-from-profile`) | `npm run submain:deploy`  |
| `sub2main` | `tenderx.engineer100@gmail.com` | `asol-sub2main` | Seller writes: product mutations, profile updates, image uploads, pharmacy catalog                                                    | `npm run sub2main:deploy` |

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

| Layer                      | Location                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Super Admin UI shell       | `src/features/super-admin/presentation/SuperAdminCloudAccountsPage.tsx`                                                                                      |
| Cloud accounts page layout | `src/features/super-admin/presentation/SuperAdminCloudAccountsContent.tsx`                                                                                   |
| Derived facts (server)     | `src/features/super-admin/server/services/cloud-accounts-facts.ts`                                                                                           |
| Provider snapshots         | `src/features/super-admin/presentation/cloud-accounts-*-snapshot.ts` (generated by `npm run cloud-accounts:*`)                                                 |
| Page wording               | `src/features/super-admin/presentation/cloud-accounts-copy.ts`                                                                                               |
| Architecture reference     | [26-cloud-accounts.md](../06-super-admin-and-operations/cloud-accounts-architecture.md)                                                                      |
| Deploy commands            | [16-deployment-targets.md](../07-mobile-and-release/deployment-targets.md), [22-scripts-and-workflows.md](../07-mobile-and-release/scripts-and-workflows.md) |
| Environment variables      | [14-environment-variables.md](../02-data-and-storage/environment-variables.md) (`VERCEL_SUBMAIN_TOKEN`, `VERCEL_SUB2MAIN_TOKEN`)                             |
| Account declarations       | `packages/account-declarations/src/accounts/*.ts`                                                                                                            |

When account layout, emails, or deploy flows change, update the sealed package
declaration (or `.env.example` for a Turso organization) and the matching
`docs/` files in the same change. Do not hardcode a parallel table or sentence in
a page component; derive it in `buildCloudAccountsFacts()` and word it in
`cloud-accounts-copy.ts`.

## Access

Visible only when `isSuperAdmin(session)` is true. Linked from the super admin
sidebar group **البيانات والنسخ الاحتياطي** → **حسابات التخزين السحابي** (see
[app-sidebar-navigation.md](../04-ui-components/app-sidebar-navigation.md)).
