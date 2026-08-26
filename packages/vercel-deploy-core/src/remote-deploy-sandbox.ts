import { randomUUID } from "node:crypto";
import path from "node:path";

import { Sandbox } from "@vercel/sandbox";

import {
  idleRemoteDeployAllSnapshot,
  isRemoteDeployAllTerminal,
  type RemoteDeployAllCallbackInput,
  type RemoteDeployAllEmailStatus,
  type RemoteDeployAllReadiness,
  type RemoteDeployAllResult,
  type RemoteDeployAllSnapshot,
} from "./remote-deploy-contracts";

const SANDBOX_NAME = "asol-gova-deploy-all";
const SANDBOX_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const COMMAND_TIMEOUT_MS = SANDBOX_TIMEOUT_MS - 60_000;
const STATE_DIRECTORY = ".deploy-all";
const STATE_FILE = `${STATE_DIRECTORY}/remote-run.json`;
const LOG_FILE = `${STATE_DIRECTORY}/remote.log`;
const LOCK_DIRECTORY = `${STATE_DIRECTORY}/remote.lock`;
const MAX_LOG_TAIL_BYTES = 200_000;
/**
 * How long a run may stay in `preparing` before another start may replace it.
 *
 * `running` is left alone however long it takes — a release legitimately runs
 * for an hour. `preparing` is owned by the request that created it, and that
 * request lives inside a serverless function that can be cut off before the
 * runner is detached; without this window the console would be locked out of
 * its own release forever.
 */
const STALE_PREPARING_MS = 15 * 60 * 1000;

interface RemoteDeployEnvironment {
  archivePassword: string;
  callbackSecret: string;
  repositoryUrl: string;
  repositoryToken: string;
}

function requiredEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): RemoteDeployAllReadiness {
  const missingConfiguration: string[] = [];
  if (!vercelCredentialsAvailable(env)) {
    missingConfiguration.push("VERCEL_OIDC_TOKEN (or run on Vercel with OIDC enabled)");
  }
  if (!env.ASOL_SECRET_ARCHIVE_PASSWORD?.trim()) {
    missingConfiguration.push("ASOL_SECRET_ARCHIVE_PASSWORD");
  }
  if (!env.ASOL_DEPLOY_CALLBACK_SECRET?.trim()) {
    missingConfiguration.push("ASOL_DEPLOY_CALLBACK_SECRET");
  }
  if (!env.ASOL_DEPLOY_NOTIFICATION_EMAIL?.trim()) {
    missingConfiguration.push("ASOL_DEPLOY_NOTIFICATION_EMAIL");
  }
  if (!env.PASSWORD_RECOVERY_GMAIL_USER?.trim()) {
    missingConfiguration.push("PASSWORD_RECOVERY_GMAIL_USER");
  }
  if (!env.PASSWORD_RECOVERY_GMAIL_APP_PASSWORD?.trim()) {
    missingConfiguration.push("PASSWORD_RECOVERY_GMAIL_APP_PASSWORD");
  }
  if (!resolveRepositoryUrl(env)) {
    missingConfiguration.push("ASOL_DEPLOY_REPOSITORY_URL or GITHUB_REPOSITORY");
  }
  return { ready: missingConfiguration.length === 0, missingConfiguration };
}

/**
 * Whether the Sandbox SDK will find a Vercel identity to authenticate with.
 *
 * On Vercel the OIDC token is **not** an environment variable: it arrives per
 * request as the `x-vercel-oidc-token` header and the SDK reads it from the
 * request context. Only local development uses `VERCEL_OIDC_TOKEN`, pulled with
 * `vercel env pull`. Demanding the variable in production reported the feature
 * as unconfigured on a project where OIDC was enabled and working.
 *
 * This stays a configuration pre-check, not an auth probe: a project with OIDC
 * disabled fails at the first Sandbox call, with the SDK's own message.
 */
function vercelCredentialsAvailable(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.VERCEL_OIDC_TOKEN?.trim() || env.VERCEL?.trim() || env.VERCEL_ENV?.trim());
}

function resolveRepositoryUrl(env: NodeJS.ProcessEnv): string | null {
  const explicit = env.ASOL_DEPLOY_REPOSITORY_URL?.trim();
  const repository = env.GITHUB_REPOSITORY?.trim();
  const candidate = explicit || (repository ? `https://github.com/${repository}.git` : "");
  if (!/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?$/.test(candidate)) {
    return null;
  }
  return candidate.endsWith(".git") ? candidate : `${candidate}.git`;
}

function deployEnvironment(env: NodeJS.ProcessEnv = process.env): RemoteDeployEnvironment {
  const readiness = requiredEnvironment(env);
  if (!readiness.ready) throw new Error("remoteDeployAllNotConfigured");
  return {
    archivePassword: env.ASOL_SECRET_ARCHIVE_PASSWORD!.trim(),
    callbackSecret: env.ASOL_DEPLOY_CALLBACK_SECRET!.trim(),
    repositoryUrl: resolveRepositoryUrl(env)!,
    repositoryToken: env.ASOL_DEPLOY_REPOSITORY_TOKEN?.trim() ?? "",
  };
}

function workspacePath(sandbox: Sandbox, relativePath: string): string {
  return path.posix.join(sandbox.cwd, relativePath);
}

async function commandOutput(
  sandbox: Sandbox,
  cmd: string,
  args: string[],
  timeoutMs = 180_000,
): Promise<string> {
  const result = await sandbox.runCommand({ cmd, args, cwd: sandbox.cwd, timeoutMs });
  if (result.exitCode !== 0) {
    const detail = (await result.stderr()).trim() || (await result.stdout()).trim();
    throw new Error(`${cmd} failed (${result.exitCode})${detail ? `: ${detail.slice(-2_000)}` : ""}`);
  }
  return result.stdout();
}

async function fileExists(sandbox: Sandbox, relativePath: string): Promise<boolean> {
  const result = await sandbox.runCommand({
    cmd: "test",
    args: ["-f", workspacePath(sandbox, relativePath)],
    cwd: sandbox.cwd,
    timeoutMs: 10_000,
  });
  return result.exitCode === 0;
}

async function readSnapshot(sandbox: Sandbox): Promise<RemoteDeployAllSnapshot> {
  if (!(await fileExists(sandbox, STATE_FILE))) return idleRemoteDeployAllSnapshot(SANDBOX_NAME);
  const raw = await sandbox.fs.readFile(workspacePath(sandbox, STATE_FILE), "utf8");
  return JSON.parse(raw) as RemoteDeployAllSnapshot;
}

async function readLogTail(sandbox: Sandbox): Promise<string> {
  if (!(await fileExists(sandbox, LOG_FILE))) return "";
  const result = await sandbox.runCommand({
    cmd: "tail",
    args: ["-c", String(MAX_LOG_TAIL_BYTES), workspacePath(sandbox, LOG_FILE)],
    cwd: sandbox.cwd,
    timeoutMs: 15_000,
  });
  if (result.exitCode !== 0) return "";
  return result.stdout();
}

async function writeSnapshot(
  sandbox: Sandbox,
  snapshot: RemoteDeployAllSnapshot,
): Promise<void> {
  await sandbox.fs.writeFile(
    workspacePath(sandbox, STATE_FILE),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );
}

function isNotFound(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: unknown } | null)?.code;
  return code === "not_found" || /not[_ -]?found/i.test(message);
}

async function existingSandbox(): Promise<Sandbox | null> {
  try {
    return await Sandbox.get({ name: SANDBOX_NAME, resume: true });
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export function remoteDeployAllReadiness(
  env: NodeJS.ProcessEnv = process.env,
): RemoteDeployAllReadiness {
  return requiredEnvironment(env);
}

export async function getRemoteDeployAllResult(): Promise<RemoteDeployAllResult> {
  const readiness = requiredEnvironment();
  if (!readiness.ready) {
    return {
      snapshot: idleRemoteDeployAllSnapshot(SANDBOX_NAME),
      logTail: "",
      readiness,
    };
  }
  const sandbox = await existingSandbox();
  if (!sandbox) {
    return {
      snapshot: idleRemoteDeployAllSnapshot(SANDBOX_NAME),
      logTail: "",
      readiness,
    };
  }
  return {
    snapshot: await readSnapshot(sandbox),
    logTail: await readLogTail(sandbox),
    readiness,
  };
}

async function postTerminalCallback(
  callbackUrl: string,
  secret: string,
  input: RemoteDeployAllCallbackInput,
): Promise<void> {
  const response = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`deploy callback failed (${response.status})`);
}

export async function startRemoteDeployAll(input: {
  initiatedByUid: string;
  callbackUrl: string;
}): Promise<RemoteDeployAllResult> {
  const config = deployEnvironment();
  const sandbox = await Sandbox.getOrCreate({
    name: SANDBOX_NAME,
    // A read token is only needed while the repository is private; the clone
    // reads `main`, and every deployment credential still comes from the
    // encrypted archive that `deploy:all` restores inside the sandbox.
    source: config.repositoryToken
      ? {
          type: "git",
          url: config.repositoryUrl,
          revision: "main",
          username: "x-access-token",
          password: config.repositoryToken,
        }
      : { type: "git", url: config.repositoryUrl, revision: "main" },
    runtime: "node24",
    persistent: true,
    timeout: SANDBOX_TIMEOUT_MS,
    resources: { vcpus: 4 },
  });
  await sandbox.fs.mkdir(workspacePath(sandbox, STATE_DIRECTORY), { recursive: true });

  const previous = await readSnapshot(sandbox);
  if (!isRemoteDeployAllTerminal(previous.status) && previous.status !== "idle") {
    const abandoned =
      previous.status === "preparing" &&
      Date.now() - Date.parse(previous.updatedAt) > STALE_PREPARING_MS;
    if (!abandoned) throw new Error("remoteDeployAllAlreadyRunning");
  }

  await sandbox.fs.rm(workspacePath(sandbox, LOCK_DIRECTORY), { recursive: true, force: true });
  await sandbox.fs.mkdir(workspacePath(sandbox, LOCK_DIRECTORY));

  const requestId = randomUUID();
  const now = new Date().toISOString();
  let snapshot: RemoteDeployAllSnapshot = {
    version: 1,
    requestId,
    status: "preparing",
    stage: "sandbox",
    sandboxName: SANDBOX_NAME,
    sandboxSessionId: sandbox.currentSession().sessionId,
    initiatedByUid: input.initiatedByUid,
    startedAt: now,
    updatedAt: now,
    emailStatus: "pending",
  };
  await writeSnapshot(sandbox, snapshot);
  await sandbox.fs.writeFile(workspacePath(sandbox, LOG_FILE), "", "utf8");

  try {
    await commandOutput(sandbox, "git", ["fetch", "origin", "main"]);
    await commandOutput(sandbox, "git", ["checkout", "-B", "main", "origin/main"]);
    await commandOutput(sandbox, "git", ["reset", "--hard", "origin/main"]);
    await commandOutput(sandbox, "git", ["clean", "-fd", "-e", `${STATE_DIRECTORY}/`]);
    await commandOutput(sandbox, "git", ["config", "user.name", "ASOL Production Deploy"]);
    await commandOutput(sandbox, "git", ["config", "user.email", "deploy@asol.app"]);

    await sandbox.runCommand({
      cmd: "node",
      args: ["scripts/run-remote-deploy-all.mjs", `--request-id=${requestId}`],
      cwd: sandbox.cwd,
      detached: true,
      timeoutMs: COMMAND_TIMEOUT_MS,
      env: {
        ASOL_SECRET_ARCHIVE_PASSWORD: config.archivePassword,
        ASOL_DEPLOY_CALLBACK_SECRET: config.callbackSecret,
        ASOL_DEPLOY_CALLBACK_URL: input.callbackUrl,
        ASOL_REMOTE_DEPLOY_REQUEST_ID: requestId,
        ASOL_REMOTE_DEPLOY_SANDBOX_NAME: SANDBOX_NAME,
        CI: "1",
      },
    });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    snapshot = {
      ...snapshot,
      status: "failed",
      stage: "sandbox",
      updatedAt: finishedAt,
      finishedAt,
      exitCode: 1,
      error: error instanceof Error ? error.message.slice(0, 2_000) : "Sandbox preparation failed.",
    };
    await writeSnapshot(sandbox, snapshot);
    await sandbox.fs.rm(workspacePath(sandbox, LOCK_DIRECTORY), { recursive: true, force: true });
    await postTerminalCallback(input.callbackUrl, config.callbackSecret, {
      snapshot,
      logTail: await readLogTail(sandbox),
    }).catch(() => undefined);
  }

  return {
    snapshot,
    logTail: await readLogTail(sandbox),
    readiness: requiredEnvironment(),
  };
}

/**
 * Record what the application did about a finished run.
 *
 * The run state lives in the sandbox, so the delivery of the email and of the
 * in-app notification must be written back there: it is what stops a second
 * poll, a second callback, or a second console session from notifying twice.
 * A snapshot from a different run is left untouched.
 */
export async function recordRemoteDeployAllNotification(input: {
  requestId: string;
  emailStatus?: RemoteDeployAllEmailStatus;
  emailError?: string;
  inAppNotified?: boolean;
}): Promise<void> {
  if (!requiredEnvironment().ready) return;
  const sandbox = await existingSandbox();
  if (!sandbox) return;
  const snapshot = await readSnapshot(sandbox);
  if (!snapshot.requestId || snapshot.requestId !== input.requestId) return;
  await writeSnapshot(sandbox, {
    ...snapshot,
    emailStatus: input.emailStatus ?? snapshot.emailStatus,
    emailError: input.emailError ?? snapshot.emailError,
    inAppNotified: input.inAppNotified ?? snapshot.inAppNotified,
    updatedAt: new Date().toISOString(),
  });
}
