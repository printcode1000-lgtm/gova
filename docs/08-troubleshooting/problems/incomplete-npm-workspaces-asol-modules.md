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

1. Ensure a real Python 3.x is on `PATH` (not the Microsoft Store stub). On
   Windows, `better-sqlite3`'s install script may fall back to `node-gyp` and
   fail without Python — see
   [npm-ci-better-sqlite3-python-windows.md](./npm-ci-better-sqlite3-python-windows.md).
2. Reinstall from the lockfile:

```bash
npm ci
```

3. Confirm every workspace is linked, then re-run the build:

```powershell
(Get-ChildItem node_modules\@asol).Count   # must equal packages/* count
node -e "require('better-sqlite3'); console.log('sqlite ok')"
npm run build
```

If `npm ci` still leaves a gap after a successful exit, delete `node_modules`
and run `npm ci` again. Do not hand-edit junctions unless you are recovering a
broken machine and understand npm workspaces.

## Related

- Installation policy: `docs/00-overview/technologies.md`
- Branding door that often surfaces first: `docs/01-architecture/branding-core-module.md`
