# `npm ci` wrongly rebuilds `better-sqlite3@13` on Windows

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

`better-sqlite3@13.0.3` contains the required Windows x64 prebuilt binary, but
the current npm install path can still infer an implicit `node-gyp rebuild`
from package metadata. That unnecessary rebuild then requires Python and the
Visual C++ toolset. Installing Python alone therefore does not make the install
reproducible.

## Fix

Use the repository installer:

```bash
npm run dependencies:install
```

On Windows it performs a lockfile-clean install without lifecycle scripts, then
executes a real in-memory SQLite query through `@asol/data-core/tooling`, loads
the `esbuild` and `unrs-resolver` binaries, and requires `npm ls --all` to pass. On
other operating systems it keeps the ordinary `npm ci` path.

## Notes

- Python and Visual C++ Build Tools remain necessary only when intentionally
  compiling a native module from source; that is not this project's verified
  Windows install path.
- Do not commit installer logs (`python-install.log`, `better-sqlite3-install.log`,
  `npm-ci-output.log`).

## Related

- `docs/00-overview/technologies.md` (install policy, `allowScripts`)
- [incomplete-npm-workspaces-asol-modules.md](./incomplete-npm-workspaces-asol-modules.md)
