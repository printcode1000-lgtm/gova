# Super Admin Cloud Accounts

## Purpose

`/super-admin/cloud-accounts` is a read-only reference for super admins. It lists
every external account this project deploys to or stores data in: six Vercel
accounts, five Turso accounts, and three Cloudflare R2 accounts.

The page shows account names, project names, login emails, and what each account
holds. It never displays tokens, keys, or secret values.

## Secondary full-app account (`submain`)

The `submain` Vercel account uses **`groupstenderximages@gmail.com`**. It hosts
the same full application codebase as the primary `gova` deployment, but it is
not GitHub-linked. Updates run only through:

```bash
npm run submain:deploy
```

Runtime database and R2 credentials match `gova`; deploy tokens for other Vercel
accounts are never pushed to the `submain` project. The project must never be
GitHub-linked — only `gova` uses the repository integration. To rebuild it:

```bash
npm run submain:recreate-vercel-project
```

## Source of truth

| Layer | Location |
|---|---|
| Super Admin UI | `src/components/super-admin/SuperAdminCloudAccountsPage.tsx` |
| Architecture reference | [26-cloud-accounts.md](../01-architecture/data-layers/26-cloud-accounts.md) |
| Deploy commands | [16-deployment-targets.md](../01-architecture/data-layers/16-deployment-targets.md), [22-scripts-and-workflows.md](../01-architecture/data-layers/22-scripts-and-workflows.md) |
| Environment variables | [14-environment-variables.md](../01-architecture/data-layers/14-environment-variables.md) (`VERCEL_SUBMAIN_TOKEN`) |
| Account declaration | `packages/account-declarations/src/accounts/submain.ts` |

When account layout, emails, or deploy flows change, update the UI page and the
matching `docs/` files in the same change.

## Access

Visible only when `isSuperAdmin(session)` is true. Linked from the super admin
sidebar group **البيانات والنسخ الاحتياطي** → **حسابات التخزين السحابي** (see
[app-sidebar-navigation.md](../04-ui-components/app-sidebar-navigation.md)).
