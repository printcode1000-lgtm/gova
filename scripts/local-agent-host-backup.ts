import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { listRunners } from "./local-agent/github-api";
import {
  HOST_BACKUP_DIRECTORY,
  NEVER_BACKED_UP,
  collectHostInventory,
  excludedSecretFiles,
  redactEnvironmentFile,
} from "./local-agent/host-inventory";
import { workspaceDir } from "./local-agent/paths";

/**
 * Capture the host configuration the local server depends on.
 *
 * The repository can always be recloned. Systemd user units, linger, the runner
 * registrations, and the runner environment files exist only on this machine, so
 * they are written *into* the repository — that way the recovery material travels
 * with the remote instead of dying with the disk.
 *
 * Registration credentials are never captured. A rebuilt runner registers again
 * with a fresh token; replaying an old credential would be both insecure and
 * useless.
 */

function argFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

async function main(): Promise<void> {
  const dryRun = argFlag("dry-run");
  const workspace = workspaceDir();
  const backupRoot = path.join(workspace, HOST_BACKUP_DIRECTORY);

  const { runners: liveRunners, error } = await listRunners();
  const labelsByRunner: Record<string, string[]> = {};
  for (const runner of liveRunners) labelsByRunner[runner.name] = runner.labels;

  const inventory = collectHostInventory(labelsByRunner);
  const excluded = excludedSecretFiles();

  const files: Record<string, string> = {};
  files["host-manifest.json"] = `${JSON.stringify(
    {
      ...inventory,
      systemdUnits: Object.keys(inventory.systemdUnits),
      runners: inventory.runners.map((runner) => ({ ...runner, environmentFile: undefined, pathFile: undefined })),
      githubRunnerQueryError: error,
      excludedSecretFiles: excluded.map((entry) => entry.path),
    },
    null,
    2,
  )}\n`;

  for (const [serviceName, contents] of Object.entries(inventory.systemdUnits)) {
    files[path.join("systemd", serviceName)] = contents;
  }
  for (const runner of inventory.runners) {
    if (runner.environmentFile !== null) {
      files[path.join("runner-env", `${runner.directoryName}.env`)] = redactEnvironmentFile(runner.environmentFile);
    }
    if (runner.pathFile !== null) {
      files[path.join("runner-env", `${runner.directoryName}.path`)] = runner.pathFile;
    }
  }
  files["README.md"] = readme(inventory.runners.length);

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, backupRoot, files: Object.keys(files).sort(), excluded }, null, 2));
    return;
  }

  rmSync(backupRoot, { recursive: true, force: true });
  for (const [relativePath, contents] of Object.entries(files)) {
    const target = path.join(backupRoot, relativePath);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, contents, { mode: 0o644 });
  }

  console.log(
    JSON.stringify(
      {
        backupRoot,
        capturedAt: inventory.capturedAt,
        systemdUnits: Object.keys(inventory.systemdUnits).length,
        runners: inventory.runners.filter((runner) => runner.installed).length,
        linger: inventory.linger,
        neverBackedUp: [...NEVER_BACKED_UP],
        githubRunnerQueryError: error,
        files: Object.keys(files).sort(),
        next: "Commit config/local-agent-host so the recovery material lives on the remote.",
      },
      null,
      2,
    ),
  );
}

function readme(runnerCount: number): string {
  return `# Local Agent Host Recovery

Captured by \`npm run local-agent:host:backup\`. Replayed by
\`npm run local-agent:host:restore\`.

## What is here

| Path | Contents |
|---|---|
| \`host-manifest.json\` | host, toolchain, linger, repository wiring, and ${runnerCount} runner descriptors |
| \`systemd/\` | the verbatim systemd **user** units for the runner pool |
| \`runner-env/\` | each runner's \`.env\` and \`.path\`, with credential-shaped lines redacted |

## What is deliberately not here

\`.credentials\`, \`.credentials_rsaparams\`, and \`.registration-token\`. Those are
runner registration secrets. A rebuilt runner registers again with a fresh
registration token derived from \`GITHUB_ADMIN_TOKEN\`, so replaying an old
credential would be insecure and would not work anyway.

## Recovering a rebuilt machine

1. Install Node and git, then clone the repository to \`/home/hesham/gova\`.
2. Restore the git-ignored secret files: \`npm run secrets:restore\`.
3. \`npm ci\`
4. \`npm run local-agent:host:restore\` — recreates the pool directories,
   downloads the recorded runner release, registers each runner against the
   repository, installs the systemd units, and starts them.
5. \`loginctl enable-linger $USER\` if the manifest recorded linger as enabled and
   restore reported it missing. This is the one step that may prompt for
   authentication, so restore never performs it for you.
6. \`npm run local-agent:doctor\` — every check must pass.

## Keeping it current

Re-run the backup after adding or removing a runner, changing a unit file,
changing runner labels, or upgrading the runner release. \`--dry-run\` shows what
would be written without touching anything.
`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
