# Generated gate fails on Windows: `spawnSync npm.cmd EINVAL`

## Symptom

`npm run deploy:all -- --phase=preflight` reaches the generated `test`, `build`, or `build:static` gate and fails before the first nested npm script starts:

```text
Error: spawnSync npm.cmd EINVAL
syscall: 'spawnSync npm.cmd'
```

The failure can appear on Node 24 even though running the same `npm run <script>` command manually works.

## Root cause

`run-generated-gate.ts` directly spawned the Windows `npm.cmd` shim with `spawnSync`. Modern Node versions reject direct `.cmd` / `.bat` execution in this form. The deployment process runner already avoided this by executing npm's JavaScript CLI through the current Node executable when `npm_execpath` is available, but the generated gate runner had a separate older implementation.

## Fix

`scripts/run-generated-gate.ts` now:

1. prefers `process.execPath + process.env.npm_execpath`, so npm runs as JavaScript without a shell;
2. uses `cmd.exe` only as a guarded Windows fallback when npm was not the parent process;
3. never directly calls `spawnSync('npm.cmd', ...)`.

The pipeline coverage test pins this behavior so the direct `npm.cmd` spawn cannot return unnoticed.

`runDeploymentNpmScript` also strips deploy-only `npm_config_phase`, `npm_config_from_phase`, `npm_config_revision`, `npm_config_runbook_branches`, and `npm_config_list_phases` from nested child environments. Those values belong to the outer `deploy:all` CLI and otherwise cause npm warnings such as:

```text
npm warn Unknown env config "phase".
```

## Retry

After pulling the fix:

```bash
git pull origin main
npm run deploy:all -- --phase=preflight
```

The architecture/native-surface report is unrelated to this failure. A native-surface inventory may be large and still be informational only.
