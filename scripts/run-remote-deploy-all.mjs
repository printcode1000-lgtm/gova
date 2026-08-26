#!/usr/bin/env node
/**
 * Runs `npm run deploy:all` inside the production deploy sandbox.
 *
 * This file is the sandbox-side half of the super-admin production deploy: the
 * application never runs a release itself, it only starts this runner in a
 * Vercel Sandbox that holds a fresh clone of `main`. The runner owns three
 * things and nothing else — the run state file the console polls, the log the
 * console tails, and the single terminal callback that lets the application
 * notify the super admin.
 *
 * `deploy:all` stays the release gate: it restores its own secrets from the
 * encrypted archive with `ASOL_SECRET_ARCHIVE_PASSWORD`, so no deployment
 * credential is ever passed through the browser, the API, or this file.
 */
import { spawn } from "node:child_process";
import { appendFile, mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const STATE_DIRECTORY = path.join(ROOT, ".deploy-all");
const STATE_FILE = path.join(STATE_DIRECTORY, "remote-run.json");
const LOG_FILE = path.join(STATE_DIRECTORY, "remote.log");
const LOCK_DIRECTORY = path.join(STATE_DIRECTORY, "remote.lock");
const MAX_LOG_TAIL_BYTES = 200_000;
const PHASE_MARKER = /\[deploy:all\] ── phase: ([a-z0-9-]+) ──/;

function argumentValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

const requestId =
  argumentValue("request-id") || process.env.ASOL_REMOTE_DEPLOY_REQUEST_ID?.trim() || "";
const command = argumentValue("command") === "deploy:push" ? "deploy:push" : "deploy:all";
const target = argumentValue("target") || "all";

async function readSnapshot() {
  try {
    return JSON.parse(await readFile(STATE_FILE, "utf8"));
  } catch {
    return {
      version: 1,
      requestId,
      status: "running",
      stage: "sandbox",
      sandboxName: process.env.ASOL_REMOTE_DEPLOY_SANDBOX_NAME?.trim() || "asol-gova-deploy-all",
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Close the open stage and open the next one.
 *
 * The console reads durations from this list rather than timing its own poll:
 * a page opened halfway through a release must still show how long every
 * earlier stage took, and a reopened page must not start counting again.
 */
function advanceStageHistory(history, stage, at) {
  const spans = Array.isArray(history) ? [...history] : [];
  const open = spans[spans.length - 1];
  if (open && !open.finishedAt) {
    if (open.stage === stage) return spans;
    spans[spans.length - 1] = { ...open, finishedAt: at };
  }
  spans.push({ stage, startedAt: at });
  return spans;
}

function closeStageHistory(history, at) {
  const spans = Array.isArray(history) ? [...history] : [];
  const open = spans[spans.length - 1];
  if (open && !open.finishedAt) spans[spans.length - 1] = { ...open, finishedAt: at };
  return spans;
}

/** Merge a patch into the state file. The console polls this file, never the process. */
async function patchSnapshot(patch) {
  const current = await readSnapshot();
  const at = new Date().toISOString();
  const stageHistory =
    patch.stage && patch.stage !== current.stage
      ? advanceStageHistory(current.stageHistory, patch.stage, at)
      : current.stageHistory;
  const snapshot = { ...current, stageHistory, ...patch, updatedAt: at };
  await writeFile(STATE_FILE, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshot;
}

async function appendLog(text) {
  await appendFile(LOG_FILE, text, "utf8");
}

async function readLogTail() {
  let size = 0;
  try {
    size = (await stat(LOG_FILE)).size;
  } catch {
    return "";
  }
  const start = Math.max(0, size - MAX_LOG_TAIL_BYTES);
  const handle = await open(LOG_FILE, "r");
  try {
    const buffer = Buffer.alloc(size - start);
    await handle.read(buffer, 0, buffer.length, start);
    return buffer.toString("utf8");
  } finally {
    await handle.close();
  }
}

/**
 * Stream a child process into the log, advancing the stage on every phase
 * banner `deploy:all` prints. Parsing its own output keeps the pipeline the
 * single source of truth for what a phase is.
 */
function runStep(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...env },
      shell: false,
    });

    let pending = Promise.resolve();
    const consume = (chunk) => {
      const text = chunk.toString("utf8");
      pending = pending
        .then(async () => {
          await appendLog(text);
          const marker = text.match(PHASE_MARKER);
          if (marker) await patchSnapshot({ stage: marker[1] });
        })
        .catch(() => undefined);
    };

    child.stdout.on("data", consume);
    child.stderr.on("data", consume);
    child.on("error", (error) => {
      pending = pending.then(() => appendLog(`\n${command} could not start: ${error.message}\n`));
      pending.then(() => resolve({ exitCode: 1, error: error.message }));
    });
    child.on("close", (code) => {
      pending.then(() =>
        resolve(
          code === 0
            ? { exitCode: 0 }
            : { exitCode: code ?? 1, error: `${command} ${args.join(" ")} exited with ${code}.` },
        ),
      );
    });
  });
}

async function postTerminalCallback(snapshot) {
  const url = process.env.ASOL_DEPLOY_CALLBACK_URL?.trim();
  const secret = process.env.ASOL_DEPLOY_CALLBACK_SECRET?.trim();
  if (!url || !secret) return;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot, logTail: await readLogTail() }),
    });
    if (!response.ok) {
      await appendLog(`\n[remote-deploy] callback rejected (${response.status}).\n`);
    }
  } catch (error) {
    await appendLog(`\n[remote-deploy] callback failed: ${error?.message ?? error}\n`);
  }
}

async function main() {
  await mkdir(STATE_DIRECTORY, { recursive: true });
  await patchSnapshot({ requestId, status: "running", stage: "dependencies" });
  await appendLog(`[remote-deploy] request ${requestId} started at ${new Date().toISOString()}\n`);

  // better-sqlite3 bundles the Linux Node 24 binary this sandbox needs. npm 11
  // nevertheless infers a node-gyp rebuild from its binding.gyp, but Vercel
  // Sandboxes intentionally do not include make. Keep the bundled binary and
  // prove it can load before starting the irreversible release pipeline.
  let outcome = await runStep("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]);
  if (outcome.exitCode === 0) {
    outcome = await runStep("npx", ["tsx", "packages/data-core/src/tooling/verify-sqlite-runtime.ts"]);
  }
  if (outcome.exitCode === 0) {
    await patchSnapshot({ stage: "preflight" });
    outcome = await runStep("npm", command === "deploy:push"
      ? ["run", "deploy:push", "--", `--vercel-target=${target}`]
      : ["run", "deploy:all"], {
      CI: "1",
      ASOL_REMOTE_DEPLOY_SANDBOX: "1",
    });
  }

  const finishedAt = new Date().toISOString();
  const stageHistory = closeStageHistory((await readSnapshot()).stageHistory, finishedAt);
  const snapshot = await patchSnapshot(
    outcome.exitCode === 0
      ? { stageHistory, status: "succeeded", stage: "complete", finishedAt, exitCode: 0, error: undefined }
      : {
          stageHistory,
          status: "failed",
          finishedAt,
          exitCode: outcome.exitCode,
          error: (outcome.error ?? `${command} failed.`).slice(0, 2_000),
        },
  );

  await rm(LOCK_DIRECTORY, { recursive: true, force: true });
  await postTerminalCallback(snapshot);
  process.exit(0);
}

main().catch(async (error) => {
  const finishedAt = new Date().toISOString();
  const snapshot = await patchSnapshot({
    status: "failed",
    finishedAt,
    exitCode: 1,
    error: String(error?.message ?? error).slice(0, 2_000),
  }).catch(() => null);
  await rm(LOCK_DIRECTORY, { recursive: true, force: true }).catch(() => undefined);
  if (snapshot) await postTerminalCallback(snapshot);
  process.exit(1);
});
