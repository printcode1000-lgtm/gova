import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { resolveGithubToken, REPOSITORY_NAME, REPOSITORY_OWNER } from "./local-agent/github-api";
import { HOST_BACKUP_DIRECTORY, SYSTEMD_USER_DIR } from "./local-agent/host-inventory";
import { RUNNER_SERVICE_NAMES, runnerPoolDir, workspaceDir } from "./local-agent/paths";

/**
 * Rebuild the local server's host configuration from the captured backup.
 *
 * Every step is idempotent and skips work that is already correct, so this is
 * safe to run on a half-broken machine as well as a bare one. It never uses
 * `sudo`: the pool runs as systemd *user* units, and the single step that can
 * require authentication — enabling linger — is reported for the operator to run
 * rather than attempted here.
 */

interface Manifest {
  capturedAt: string;
  workspace: string;
  runnerPoolDir: string;
  linger: boolean;
  repository: { origin: string; hooksPath: string; credentialHelper: string };
  runners: Array<{
    directoryName: string;
    githubName: string;
    serviceName: string;
    runnerVersion: string | null;
    workFolder: string | null;
    labels: string[];
  }>;
}

function argFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

const dryRun = argFlag("dry-run");
const steps: string[] = [];

function step(description: string, action: () => void): void {
  if (dryRun) {
    steps.push(`would: ${description}`);
    return;
  }
  action();
  steps.push(`done: ${description}`);
}

function run(command: string, args: string[], cwd?: string): void {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with ${result.status}.`);
}

async function registrationToken(): Promise<string> {
  const token = resolveGithubToken();
  if (!token) throw new Error("No local GitHub token; restore cannot register runners. Run npm run secrets:restore first.");
  const response = await fetch(
    `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/actions/runners/registration-token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "gova-local-agent-host-restore",
      },
    },
  );
  if (!response.ok) throw new Error(`Could not obtain a runner registration token: ${response.status}.`);
  return (await response.json() as { token: string }).token;
}

function isRegistered(directory: string): boolean {
  return existsSync(path.join(directory, ".runner")) && existsSync(path.join(directory, ".credentials"));
}

function downloadRunner(directory: string, version: string): void {
  const archive = `actions-runner-linux-x64-${version}.tar.gz`;
  const url = `https://github.com/actions/runner/releases/download/v${version}/${archive}`;
  mkdirSync(directory, { recursive: true });
  run("curl", ["-fsSL", "-o", path.join(directory, archive), url]);
  run("tar", ["xzf", archive], directory);
}

async function main(): Promise<void> {
  const workspace = workspaceDir();
  const backupRoot = path.join(workspace, HOST_BACKUP_DIRECTORY);
  const manifestPath = path.join(backupRoot, "host-manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`No host backup at ${manifestPath}. Run npm run local-agent:host:backup on a healthy machine first.`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  const pool = runnerPoolDir();

  step(`create the runner pool root at ${pool}`, () => mkdirSync(pool, { recursive: true }));

  step("point git at the repository hooks and the local credential helper", () => {
    if (manifest.repository.hooksPath) {
      run("git", ["-C", workspace, "config", "--local", "core.hooksPath", manifest.repository.hooksPath]);
    }
    if (manifest.repository.credentialHelper) {
      run("git", ["-C", workspace, "config", "--local", "credential.helper", manifest.repository.credentialHelper]);
    }
  });

  for (const runner of manifest.runners) {
    const directory = path.join(pool, runner.directoryName);
    const version = runner.runnerVersion;

    if (!existsSync(path.join(directory, "config.sh"))) {
      if (!version) {
        steps.push(`skipped: ${runner.directoryName} has no recorded runner version to download`);
        continue;
      }
      step(`download and unpack actions runner ${version} into ${runner.directoryName}`, () =>
        downloadRunner(directory, version),
      );
    }

    for (const suffix of [".env", ".path"] as const) {
      const source = path.join(backupRoot, "runner-env", `${runner.directoryName}${suffix}`);
      if (!existsSync(source)) continue;
      step(`restore ${runner.directoryName}${suffix}`, () =>
        writeFileSync(path.join(directory, suffix), readFileSync(source, "utf8"), { mode: 0o644 }),
      );
    }

    if (!isRegistered(directory)) {
      const token = dryRun ? "<registration-token>" : await registrationToken();
      step(`register ${runner.githubName} with labels ${runner.labels.join(",")}`, () =>
        run(
          path.join(directory, "config.sh"),
          [
            "--unattended",
            "--replace",
            "--url",
            `https://github.com/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`,
            "--token",
            token,
            "--name",
            runner.githubName,
            "--labels",
            runner.labels.filter((label) => !["self-hosted", "Linux", "X64"].includes(label)).join(",") || "gova",
            "--work",
            runner.workFolder || "_work",
          ],
          directory,
        ),
      );
    }
  }

  for (const serviceName of RUNNER_SERVICE_NAMES) {
    const source = path.join(backupRoot, "systemd", serviceName);
    if (!existsSync(source)) continue;
    step(`install systemd user unit ${serviceName}`, () => {
      mkdirSync(SYSTEMD_USER_DIR, { recursive: true });
      writeFileSync(path.join(SYSTEMD_USER_DIR, serviceName), readFileSync(source, "utf8"), { mode: 0o644 });
    });
  }

  step("reload systemd user units", () => run("systemctl", ["--user", "daemon-reload"]));
  for (const serviceName of RUNNER_SERVICE_NAMES) {
    if (!existsSync(path.join(SYSTEMD_USER_DIR, serviceName))) continue;
    step(`enable and start ${serviceName}`, () => run("systemctl", ["--user", "enable", "--now", serviceName]));
  }

  const lingerNeeded =
    manifest.linger &&
    execFileSync("loginctl", ["show-user", process.env.USER || "hesham", "-p", "Linger"], { encoding: "utf8" }).trim() !==
      "Linger=yes";

  console.log(
    JSON.stringify(
      {
        dryRun,
        backupRoot,
        capturedAt: manifest.capturedAt,
        steps,
        lingerAction: lingerNeeded
          ? `Run: loginctl enable-linger ${process.env.USER || "hesham"} — the pool will not survive logout without it.`
          : null,
        next: "npm run local-agent:doctor",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
