# Incomplete npm workspaces: `Cannot find module '@asol/…'`

## Symptom

`npm run build` fails during an early test suite (often `test:notifications`) with:

```text
Cannot find module '@asol/branding-core'
Require stack:
- …/packages/account-bridge/src/mobile-push/fcm-message.ts
```

Any other sealed package under `packages/` can appear the same way when its
workspace link is missing.

## Root cause

Root `package.json` declares `"workspaces": ["packages/*"]`. A healthy install
puts every `packages/<name>` behind `node_modules/@asol/<name>` (symlink /
junction).

When `node_modules` is only partly populated — interrupted install, failed
`npm ci`, manual deletion, or a stale tree after adding packages — some
`@asol/*` links are absent while others remain. Resolution then fails at the
first import of a missing package.

Quick check on Windows (PowerShell):

```powershell
(Get-ChildItem packages -Directory).Count
(Get-ChildItem node_modules\@asol -ErrorAction SilentlyContinue).Count
```

The two counts must match. If they do not, the tree is incomplete.

## Fix

1. Reinstall from the lockfile with the project-owned compatibility wrapper:

```bash
npm run dependencies:install
```

   On Windows this avoids npm's erroneous `better-sqlite3@13` rebuild while
   still executing and validating the bundled binary. See
   [npm-ci-better-sqlite3-python-windows.md](./npm-ci-better-sqlite3-python-windows.md).
2. Confirm every workspace is linked, then re-run the build:

```powershell
(Get-ChildItem node_modules\@asol).Count   # must equal packages/* count
node -e "require('better-sqlite3'); console.log('sqlite ok')"
npm run build
```

If the wrapper still leaves a gap after a successful exit, remove only the
known incomplete `node_modules` tree and run it again. Do not hand-edit
junctions unless recovering a broken machine and you understand npm workspaces.

## Related

- Installation policy: `docs/00-overview/technologies.md`
- Branding door that often surfaces first: `docs/07-mobile-and-release/capacitor/branding-core-module.md`
