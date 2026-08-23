# `npm ci` fails on Windows: `better-sqlite3` / `node-gyp` needs Python

## Symptom

`npm ci` (or a fresh `npm install`) ends with:

```text
npm error path …\node_modules\better-sqlite3
npm error command failed
npm error command … node-gyp rebuild
npm error gyp ERR! find Python
npm error gyp ERR! find Python You need to install the latest version of Python.
npm error stack Error: Could not find any Python installation to use
```

After a failed run, `node_modules/better-sqlite3` may be missing entirely even
when workspace packages under `node_modules/@asol/*` look complete. Later
`npm run build` steps that touch SQLite (`db:ensure`, data-core tests) then fail.

The WindowsApps `python.exe` stub does **not** count:

```text
Python was not found; run without arguments to install from the Microsoft Store
```

## Root cause

`better-sqlite3` is an approved native install script (`allowScripts` in root
`package.json`). When a matching prebuild is unavailable or the install path
rebuilds, `node-gyp` requires a real Python 3.6+ interpreter. Store aliases and
empty `PYTHON` leave the rebuild with nothing to use.

Node 24 (ABI / `modules` 137) is in the project's engine range; rebuilds are
more likely when prebuilds for that ABI are missing or when cleanup after a
failed install removes the package.

## Fix

1. Install a real Python 3.12+ (example via winget):

```powershell
winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
```

2. Open a **new** terminal so `PATH` picks up
   `%LOCALAPPDATA%\Programs\Python\Python312\`. Confirm:

```powershell
python --version
# expect: Python 3.12.x  (not the Store message)
```

Optional for the current session only:

```powershell
$env:PYTHON = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
$env:Path = "$(Split-Path $env:PYTHON);$(Split-Path $env:PYTHON)\Scripts;$env:Path"
```

3. Restore the native module (full tree preferred):

```bash
npm ci
```

If only `better-sqlite3` is missing and workspaces are already linked:

```bash
npm install better-sqlite3@13.0.3 --no-save
node -e "require('better-sqlite3'); console.log('load OK')"
```

Prefer `npm ci` when the lockfile and `node_modules` may be inconsistent.

4. Re-run `npm run build`.

## Notes

- Visual C++ Build Tools are also required if `node-gyp` compiles from source
  and no Windows prebuild is used. A successful `require('better-sqlite3')`
  after install is the practical gate.
- Do not commit installer logs (`python-install.log`, `better-sqlite3-install.log`,
  `npm-ci-output.log`).

## Related

- `docs/00-overview/technologies.md` (install policy, `allowScripts`)
- [incomplete-npm-workspaces-asol-modules.md](./incomplete-npm-workspaces-asol-modules.md)
