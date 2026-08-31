import "server-only";

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import {
  appStoreConnectCredentialsAreReady,
  googlePlayCredentialsAreReady,
  readShippingPlatformsDeclaration,
  requireGooglePlayProductionNativeVersion,
  requireIosProductionNativeVersion,
} from "@asol/ota-core/release-console";
import { loadReleaseToolEnvironment } from "@asol/env-core/process";
import { getOtaApprovalServerConfig } from "@asol/ota-core/release-console";
import { BUILD_COMMAND_CATALOG, findBuildCommand, materializeBuildCommandParameters, type BuildCommandCatalogEntry } from "../console";
import { nextBuildJobActivity, nextBuildJobStage } from "../console";
import { assertBuildJobTransition, type BuildCommandReadiness, type BuildJobRecord, type PaginatedBuildJobs, type ReleaseVersionSnapshot, type StartBuildJobInput } from "../console";
import { changedBuildArtifacts, snapshotBuildOutputs } from "./build-job-artifacts";
import {
  JOB_DIR,
  JOB_ID_PATTERN,
  JOB_RETENTION,
  LOCK_PATH,
  LOG_CHUNK_BYTES,
  RECORD_READ_ATTEMPTS,
  RECORD_READ_RETRY_MS,
  RECORD_RENAME_ATTEMPTS,
  RECORD_RENAME_RETRY_MS,
  logPath,
  recordPath,
} from "./build-job-files";

export interface ReleaseConsolePorts {
  assertAllowed(): void;
  currentWebContentVersion: string;
  releaseRequirementSatisfied(requirement: string): boolean;
  resolveNpmCliPath(): string;
  childProcessEnvironment(): NodeJS.ProcessEnv;
  getAbsoluteJson<T>(url: string, options: { suppressErrorLog: true; signal?: AbortSignal }): Promise<T>;
}

let releaseConsolePorts: ReleaseConsolePorts = {
  assertAllowed() {
    throw new Error("releaseConsolePortsNotConfigured");
  },
  currentWebContentVersion: "0.0.0.0",
  releaseRequirementSatisfied: () => false,
  resolveNpmCliPath: () => {
    throw new Error("releaseConsolePortsNotConfigured");
  },
  childProcessEnvironment: () => process.env,
  getAbsoluteJson: async () => {
    throw new Error("releaseConsolePortsNotConfigured");
  },
};

export function configureReleaseConsolePorts(ports: ReleaseConsolePorts): void {
  releaseConsolePorts = ports;
}

const liveProcesses = new Map<string, ChildProcessWithoutNullStreams>();
let reconciliation: Promise<void> | null = null;

type LockRecord = { jobId: string; pid: number; commandId: string; startedAt: string };

export function trackBuildJobProcess(jobId: string, child: ChildProcessWithoutNullStreams): void {
  assertBuildJobId(jobId);
  liveProcesses.set(jobId, child);
}

export function assertBuildJobId(jobId: string): void {
  if (!JOB_ID_PATTERN.test(jobId)) throw new Error("releaseJobIdInvalid");
}

export function isProcessAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export async function acquireBuildJobLock(lock: LockRecord, lockPath = LOCK_PATH, alive = isProcessAlive): Promise<void> {
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await fs.open(lockPath, "wx");
      try { await handle.writeFile(JSON.stringify(lock), "utf8"); } finally { await handle.close(); }
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const current = await readLock(lockPath);
      if (current && alive(current.pid)) throw new Error(`releaseCommandSingleFlightActive:${current.jobId}`);
      await fs.appendFile(path.join(path.dirname(lockPath), "reconciliation.log"), `${new Date().toISOString()} reclaimed stale lock ${current?.jobId ?? "invalid"}\n`);
      await removeIfExists(lockPath);
    }
  }
  throw new Error("releaseCommandSingleFlightActive");
}

export async function releaseBuildJobLock(jobId: string, lockPath = LOCK_PATH): Promise<void> {
  const current = await readLock(lockPath);
  if (current?.jobId === jobId) await removeIfExists(lockPath);
}

async function updateLockPid(jobId: string, pid: number): Promise<void> {
  const current = await readLock(LOCK_PATH);
  if (current?.jobId === jobId) {
    const temporaryPath = `${LOCK_PATH}.${jobId}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify({ ...current, pid }), "utf8");
    await fs.rename(temporaryPath, LOCK_PATH);
  }
}

async function readLock(lockPath: string): Promise<LockRecord | null> {
  try { return JSON.parse(await fs.readFile(lockPath, "utf8")) as LockRecord; } catch { return null; }
}

/**
 * Written through a temporary file and renamed into place.
 *
 * A running job rewrites its record on every status change while the console
 * polls the list every few seconds; writing in place lets a reader observe a
 * half-written file and fail with a JSON syntax error. Rename is atomic, so a
 * reader always sees either the previous record or the complete new one.
 */
async function writeRecord(record: BuildJobRecord): Promise<void> {
  await fs.mkdir(JOB_DIR, { recursive: true });
  const destination = recordPath(record.id);
  const temporaryPath = `${destination}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(record, null, 2), "utf8");

  // Windows refuses to rename over a file a reader currently holds open, so the
  // rename is retried briefly. If it never wins, the status update matters more
  // than atomicity — `readAllRecords` tolerates a record it cannot parse.
  for (let attempt = 0; attempt < RECORD_RENAME_ATTEMPTS; attempt += 1) {
    try {
      await fs.rename(temporaryPath, destination);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const contended = code === "EPERM" || code === "EBUSY" || code === "EACCES";
      if (!contended || attempt === RECORD_RENAME_ATTEMPTS - 1) {
        await removeIfExists(temporaryPath);
        if (!contended) throw error;
        await fs.writeFile(destination, JSON.stringify(record, null, 2), "utf8");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, RECORD_RENAME_RETRY_MS));
    }
  }
}

/**
 * Reads one record, retrying a torn read.
 *
 * Even with the atomic write above, a contended rename can fall back to an
 * in-place write, so a reader may still catch a partial file. That state lasts
 * microseconds, and re-reading resolves it — unlike surfacing a JSON syntax
 * error, which the API layer reports as an `invalidJsonBody` 400.
 */
async function readRecordFile(filePath: string): Promise<BuildJobRecord> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RECORD_READ_ATTEMPTS; attempt += 1) {
    try { return JSON.parse(await fs.readFile(filePath, "utf8")) as BuildJobRecord; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw error;
      if (!(error instanceof SyntaxError)) throw error;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, RECORD_READ_RETRY_MS));
    }
  }
  throw lastError;
}

export async function readBuildJobRecord(jobId: string): Promise<BuildJobRecord> {
  assertBuildJobId(jobId);
  try { return await readRecordFile(recordPath(jobId)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("releaseJobNotFound"); throw error; }
}

function now(): string { return new Date().toISOString(); }

async function appendLog(jobId: string, chunk: string | Buffer): Promise<void> {
  assertBuildJobId(jobId);
  await fs.mkdir(JOB_DIR, { recursive: true });
  await fs.appendFile(logPath(jobId), chunk);
}

/**
 * The last line of output worth showing on a failed job's chip.
 *
 * Scripts here end with a plain sentence explaining the failure. Stage and step
 * markers, blank lines and npm's own exit noise are skipped: they are true but
 * say nothing, and the one line that helps is usually just above them.
 */
export function lastMeaningfulLine(output: string): string | undefined {
  const line = output
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .filter((candidate) =>
      candidate
      && !candidate.startsWith("[stage]")
      && !candidate.startsWith("[step]")
      && !/^npm (?:ERR|WARN|notice)/.test(candidate)
      && !/^>/.test(candidate))
    .pop();
  if (!line) return undefined;
  return line.length > 300 ? `${line.slice(0, 299)}…` : line;
}

export function commandReadiness(command: BuildCommandCatalogEntry): BuildCommandReadiness {
  loadReleaseToolEnvironment();
  const missingEnv = command.requiredEnv
    .filter((requirement) => !releaseConsolePorts.releaseRequirementSatisfied(requirement))
    .map((requirement) => requirement.split("|")[0] as string);
  return { commandId: command.id, ready: missingEnv.length === 0, missingEnv, reason: missingEnv.length ? "releaseCommandMissingEnvironment" : undefined };
}

export function assertCommandReadiness(command: BuildCommandCatalogEntry): void {
  const readiness = commandReadiness(command);
  if (!readiness.ready) throw new Error(`releaseCommandMissingEnvironment:${readiness.missingEnv.join(",")}`);
}

export async function startBuildJob(input: StartBuildJobInput): Promise<BuildJobRecord> {
  releaseConsolePorts.assertAllowed();
  await ensureReconciled();
  const command = findBuildCommand(input.commandId);
  if (!command) throw new Error("releaseCommandUnknown");
  assertCommandReadiness(command);
  if (command.danger === "publishes-live" && input.confirmationPhrase !== command.confirmationPhrase) throw new Error("releaseCommandConfirmationRequired");
  const parameterArgv = materializeBuildCommandParameters(command, input.parameters);
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8).padEnd(6, "0")}`;
  if (command.exclusive) await acquireBuildJobLock({ jobId: id, pid: process.pid, commandId: command.id, startedAt: now() });
  try {
    const record: BuildJobRecord = {
      id, commandId: command.id,
      command: { id: command.id, script: command.script, argv: [...command.argv, ...parameterArgv], category: command.category, danger: command.danger },
      status: "queued", stage: "queued", queuedAt: now(),
      logPath: path.relative(process.cwd(), logPath(id)).replace(/\\/g, "/"),
      artifactSnapshot: await snapshotBuildOutputs(),
    };
    await writeRecord(record);
    void runJob(record, command).catch(async (error) => {
      try {
        const failed = await readBuildJobRecord(id);
        if (failed.status === "queued" || failed.status === "running") {
          setJobStatus(failed, "failed"); failed.error = error instanceof Error ? error.message : String(error); failed.finishedAt = now(); await writeRecord(failed);
        }
      } finally { if (command.exclusive) await releaseBuildJobLock(id); }
    });
    return buildJobForClient(record);
  } catch (error) {
    if (command.exclusive) await releaseBuildJobLock(id);
    throw error;
  }
}

export async function listBuildJobs(page = 1, pageSize = 20): Promise<PaginatedBuildJobs> {
  releaseConsolePorts.assertAllowed();
  await ensureReconciled();
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.min(50, Math.floor(pageSize)));
  await pruneRecords();
  const jobs = await interruptDeadJobs(await readAllRecords());
  const start = (safePage - 1) * safeSize;
  return {
    jobs: jobs.slice(start, start + safeSize).map(buildJobForClient),
    page: safePage, pageSize: safeSize, total: jobs.length,
    hasMore: start + safeSize < jobs.length,
  };
}

/**
 * Mark jobs whose process is gone as interrupted, and free the lock they hold.
 *
 * `ensureReconciled` recovers jobs orphaned *before* this process started, and
 * it runs exactly once because that is a startup concern. Nothing covered a
 * job that died afterwards — and one does every time the dev server hot-reloads
 * while a build is running, because the reload drops the `close` handler that
 * would have finalized it. The record then stays `running` forever, keeps the
 * exclusive lock, and disables every button on the page until someone restarts
 * the server.
 *
 * This runs on the records the listing already read, so it costs no extra I/O.
 * A job this process is still running is never touched, and neither is a queued
 * job whose owner holds the lock and is alive — it simply has no pid yet.
 */
async function interruptDeadJobs(jobs: BuildJobRecord[]): Promise<BuildJobRecord[]> {
  const lock = await readLock(path.join(JOB_DIR, "exclusive.lock"));
  const recovered: BuildJobRecord[] = [];
  for (const job of jobs) {
    if (job.status !== "running" && job.status !== "queued") { recovered.push(job); continue; }
    if (liveProcesses.has(job.id)) { recovered.push(job); continue; }
    const ownedQueuedJob = job.status === "queued" && lock?.jobId === job.id && isProcessAlive(lock.pid);
    if (ownedQueuedJob || (job.pid && isProcessAlive(job.pid))) { recovered.push(job); continue; }
    // A job whose record was written moments ago is not abandoned, whatever its
    // process id says: it is either still reporting progress, or its runner is
    // inside the finalize window, where the child is already gone and the
    // result is not written yet. `liveProcesses` alone cannot be trusted for
    // this — the dev server can serve a request from a different module
    // instance, whose map is empty — so the freshness of the record on disk is
    // what decides. Claiming such a job strands it as `interrupted` and throws
    // away the outcome it was about to record.
    if (await writtenRecently(job.id)) { recovered.push(job); continue; }
    setJobStatus(job, "interrupted");
    job.finishedAt = now();
    job.error = job.error ?? "releaseCommandInterrupted";
    await writeRecord(job);
    await releaseBuildJobLock(job.id);
    recovered.push(job);
  }
  return recovered;
}

/**
 * Long enough to cover finalizing a release: hashing every changed artifact
 * includes SHA-256 over a multi-hundred-megabyte AAB. Short enough that a
 * genuinely abandoned job frees its lock without anyone waiting on it.
 */
const ABANDONED_RECORD_GRACE_MS = 120_000;

async function writtenRecently(jobId: string): Promise<boolean> {
  try {
    const stat = await fs.stat(recordPath(jobId));
    return Date.now() - stat.mtimeMs < ABANDONED_RECORD_GRACE_MS;
  } catch {
    return false;
  }
}

async function releaseVersionSnapshot(): Promise<ReleaseVersionSnapshot> {
  loadReleaseToolEnvironment();
  const shippingPlatforms = readShippingPlatformsDeclaration();
  const snapshot: ReleaseVersionSnapshot = {
    contentCurrent: releaseConsolePorts.currentWebContentVersion,
    androidReady: googlePlayCredentialsAreReady(),
    iosStoreDistribution: shippingPlatforms.ios.storeDistribution,
    iosReady: shippingPlatforms.ios.storeDistribution
      ? appStoreConnectCredentialsAreReady()
      : undefined,
  };
  try {
    const gradle = await fs.readFile(
      path.join(process.cwd(), "android", "app", "build.gradle"),
      "utf8",
    );
    snapshot.androidCurrent = /versionName\s+"(\d+\.\d+\.\d+)"/.exec(gradle)?.[1];
  } catch { /* The catalog remains usable when the Android project is absent. */ }

  try {
    snapshot.androidProduction = await requireGooglePlayProductionNativeVersion();
  } catch (error) {
    snapshot.androidTruthError = error instanceof Error ? error.message : String(error);
  }
  if (shippingPlatforms.ios.storeDistribution) {
    try {
      snapshot.iosProduction = await requireIosProductionNativeVersion();
    } catch (error) {
      snapshot.iosTruthError = error instanceof Error ? error.message : String(error);
    }
  }

  const manifestUrl = getOtaApprovalServerConfig().manifestUrl;
  if (manifestUrl) {
    try {
      const manifest = await releaseConsolePorts.getAbsoluteJson<{ version?: unknown }>(manifestUrl, {
        suppressErrorLog: true,
        signal: AbortSignal.timeout(5_000),
      });
      if (typeof manifest.version === "string") snapshot.otaCurrent = manifest.version;
    } catch { /* A temporary R2 read failure must not hide the command catalog. */ }
  }
  return snapshot;
}

export async function buildCommandCatalogPayload(): Promise<{
  catalog: readonly BuildCommandCatalogEntry[];
  readiness: BuildCommandReadiness[];
  versions: ReleaseVersionSnapshot;
}> {
  releaseConsolePorts.assertAllowed();
  await ensureReconciled();
  return {
    catalog: BUILD_COMMAND_CATALOG,
    readiness: BUILD_COMMAND_CATALOG.map(commandReadiness),
    versions: await releaseVersionSnapshot(),
  };
}

export async function cancelBuildJob(jobId: string): Promise<BuildJobRecord> {
  releaseConsolePorts.assertAllowed();
  assertBuildJobId(jobId);
  const record = await readBuildJobRecord(jobId);
  const pid = liveProcesses.get(jobId)?.pid ?? record.pid;
  let killError: unknown;
  try {
    if (pid && isProcessAlive(pid)) await terminateProcessTree(pid);
  } catch (error) { killError = error; }
  const stillAlive = Boolean(pid && isProcessAlive(pid));
  if (killError || stillAlive) {
    record.error = `releaseCommandCancelFailed:${
      killError instanceof Error ? killError.message : stillAlive ? "processStillRunning" : String(killError)
    }`;
    await writeRecord(record);
    return record;
  }
  if (record.status === "queued" || record.status === "running") setJobStatus(record, "cancelled");
  record.finishedAt = now();
  liveProcesses.delete(jobId);
  await writeRecord(record);
  await releaseBuildJobLock(jobId);
  return buildJobForClient(record);
}

export async function terminateProcessTree(
  pid: number,
  platform: NodeJS.Platform = process.platform,
  alive: (candidate: number) => boolean = isProcessAlive,
): Promise<void> {
  if (platform === "win32") {
    await new Promise<void>((resolve, reject) => {
      const killer = spawn("taskkill.exe", ["/pid", String(pid), "/T", "/F"], { shell: false });
      killer.once("error", reject);
      killer.once("close", (code) => code === 0 ? resolve() : reject(new Error(`taskkill:${code}`)));
    });
  } else {
    process.kill(pid, "SIGTERM");
  }
  for (let attempt = 0; attempt < 40 && alive(pid); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (alive(pid)) throw new Error("processStillRunning");
}

export async function readBuildJobLog(
  jobId: string,
  offset = 0,
): Promise<{ text: string; nextOffset: number; hasMore: boolean }> {
  releaseConsolePorts.assertAllowed();
  assertBuildJobId(jobId);
  let handle;
  try { handle = await fs.open(logPath(jobId), "r"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("releaseJobLogNotFound"); throw error; }
  try {
    const stat = await handle.stat();
    const start = Math.max(0, Math.min(Number.isFinite(offset) ? Math.floor(offset) : 0, stat.size));
    const length = Math.min(LOG_CHUNK_BYTES, stat.size - start);
    const buffer = Buffer.alloc(length);
    if (buffer.length) await handle.read(buffer, 0, buffer.length, start);
    const nextOffset = start + buffer.length;
    return { text: buffer.toString("utf8"), nextOffset, hasMore: nextOffset < stat.size };
  } finally { await handle.close(); }
}

export async function artifactsForJob(jobId: string) {
  releaseConsolePorts.assertAllowed();
  return (await readBuildJobRecord(jobId)).artifacts ?? [];
}

async function runJob(record: BuildJobRecord, command: BuildCommandCatalogEntry): Promise<void> {
  const latest = await readBuildJobRecord(record.id);
  if (latest.status === "cancelled") { await releaseBuildJobLock(record.id); return; }
  setJobStatus(latest, "running"); latest.stage = "starting"; latest.startedAt = now();
  await writeRecord(latest);
  await appendLog(record.id, `> npm run ${command.script} -- ${latest.command.argv.join(" ")}\n`);
  const child = spawn(
    process.execPath,
    [releaseConsolePorts.resolveNpmCliPath(), "run", command.script, "--", ...latest.command.argv],
    { cwd: process.cwd(), shell: false, env: releaseConsolePorts.childProcessEnvironment() },
  );
  latest.pid = child.pid;
  await writeRecord(latest);
  if (child.pid && command.exclusive) await updateLockPid(record.id, child.pid);
  trackBuildJobProcess(record.id, child);
  let recentOutput = "";
  let stageWrites = Promise.resolve();
  const captureOutput = (chunk: string | Buffer) => {
    void appendLog(record.id, chunk);
    recentOutput = `${recentOutput}${chunk.toString()}`.slice(-4_096);
    stageWrites = stageWrites.then(async () => {
      const current = await readBuildJobRecord(record.id);
      if (current.status !== "running") return;
      const nextStage = nextBuildJobStage(current.stage ?? "starting", recentOutput);
      const nextActivity = nextBuildJobActivity(current.activity, recentOutput);
      if (nextStage !== current.stage || nextActivity !== current.activity) {
        current.stage = nextStage;
        current.activity = nextActivity;
        await writeRecord(current);
      }
      // A rejection here would poison the chain, and `close` waits on that same
      // chain before finalizing — so one failed progress write meant the job
      // never recorded its result at all. Progress is the least important thing
      // this runner does; it must never be able to lose the outcome.
    }).catch(() => {});
  };
  child.stdout.on("data", captureOutput);
  child.stderr.on("data", captureOutput);
  let finalized = false;
  const finalize = async (status: "succeeded" | "failed", code: number | null, error?: string) => {
    if (finalized) return; finalized = true;
    // Ownership is released in the `finally`, not here. Finalizing hashes every
    // changed artifact — SHA-256 over a 38 MB APK is not instant — and during
    // that window the child is already dead while the record still says
    // `running`. Dropping ownership first let the liveness sweep declare a job
    // interrupted moments before it wrote its real result.
    try {
      let current = await readBuildJobRecord(record.id);
      if (current.status !== "cancelled") {
        // Where the command actually stopped. Collecting artifacts is a step
        // this runner performs afterwards, so overwriting the stage with it
        // told every failed job it "failed at finalizing-results" — the one
        // stage that had nothing to do with the failure.
        const stageAtExit = current.stage;
        current.stage = "finalizing-results";
        await writeRecord(current);
        const snapshot = current.artifactSnapshot ?? {};
        const artifacts = await changedBuildArtifacts(snapshot);
        current = await readBuildJobRecord(record.id);
        // Anything terminal reached while artifacts were being hashed wins:
        // a cancellation the user asked for, or a recovery that beat us to it.
        // Forcing a transition out of a terminal status throws, and the throw
        // would leave the record frozen in whatever state stole it.
        if (current.status === "running" || current.status === "queued") {
          setJobStatus(current, status); current.exitCode = code; current.finishedAt = now();
          // A command that exits non-zero has usually already said why. Losing
          // that sentence leaves a red chip with a job id and no reason, and
          // sends the reader to the log for something the card could have said.
          current.error = error ?? (status === "failed" ? lastMeaningfulLine(recentOutput) : undefined);
          if (status === "succeeded") current.stage = "completed";
          // On failure the last stage and step are the most useful things on
          // the card: together they name what was running when it broke.
          else current.stage = stageAtExit;
          if (status === "succeeded") delete current.activity;
          current.artifacts = artifacts;
          delete current.artifactSnapshot;
          await writeRecord(current);
        }
      }
    } finally {
      liveProcesses.delete(record.id);
      if (command.exclusive) await releaseBuildJobLock(record.id);
    }
  };
  // `catch` before `then` on both: the outcome must be recorded even if every
  // progress write failed.
  child.once("error", (error) => void stageWrites.catch(() => {}).then(() => finalize("failed", null, error.message)));
  child.once("close", (code) => void stageWrites.catch(() => {}).then(() => finalize(code === 0 ? "succeeded" : "failed", code)));
}

async function ensureReconciled(): Promise<void> {
  if (!reconciliation) reconciliation = reconcileAndPrune().catch((error) => { reconciliation = null; throw error; });
  await reconciliation;
}

export async function reconcileBuildJobs(jobDir = JOB_DIR, alive = isProcessAlive): Promise<void> {
  await fs.mkdir(jobDir, { recursive: true });
  const files = (await fs.readdir(jobDir)).filter((file) => JOB_ID_PATTERN.test(file.replace(/\.json$/, "")) && file.endsWith(".json"));
  const lock = await readLock(path.join(jobDir, "exclusive.lock"));
  for (const file of files) {
    const fullPath = path.join(jobDir, file);
    // Reconciliation runs before every listing, so a single record caught
    // mid-write took the whole job list down with `Unexpected end of JSON
    // input` — the page went blank while nothing was actually wrong. Use the
    // same retrying reader as every other read, and skip a file that still
    // will not parse: one damaged record must not hide the rest.
    let record: BuildJobRecord;
    try {
      record = await readRecordFile(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`Skipping unreadable build job record ${file}: ${error instanceof Error ? error.message : error}`);
      }
      continue;
    }
    const ownedQueuedJob = record.status === "queued" && lock?.jobId === record.id && alive(lock.pid);
    if ((record.status === "running" || record.status === "queued") && !ownedQueuedJob && (!record.pid || !alive(record.pid))) {
      setJobStatus(record, "interrupted"); record.finishedAt = now(); record.error = "releaseCommandInterrupted";
      await fs.writeFile(fullPath, JSON.stringify(record, null, 2), "utf8");
      await releaseBuildJobLock(record.id, path.join(jobDir, "exclusive.lock"));
    }
  }
  if (lock && !alive(lock.pid)) await releaseBuildJobLock(lock.jobId, path.join(jobDir, "exclusive.lock"));
}

async function reconcileAndPrune(): Promise<void> {
  await reconcileBuildJobs();
  await pruneRecords();
}

async function pruneRecords(): Promise<void> {
  const records = await readAllRecords();
  for (const record of records.slice(JOB_RETENTION)) {
    await removeIfExists(recordPath(record.id));
    await removeIfExists(logPath(record.id));
  }
}

async function readAllRecords(): Promise<BuildJobRecord[]> {
  await fs.mkdir(JOB_DIR, { recursive: true });
  const files = (await fs.readdir(JOB_DIR)).filter((file) => JOB_ID_PATTERN.test(file.replace(/\.json$/, "")) && file.endsWith(".json"));
  // One unreadable record must not blank the whole console: it is skipped so
  // the remaining jobs still list. Reading a single job still surfaces its error.
  const jobs = await Promise.all(files.map(async (file) => {
    try { return await readRecordFile(path.join(JOB_DIR, file)); }
    catch { return null; }
  }));
  return jobs.filter((job): job is BuildJobRecord => Boolean(job?.queuedAt))
    .sort((left, right) => right.queuedAt.localeCompare(left.queuedAt));
}

/** Internal output snapshots can contain thousands of paths and never belong in API responses. */
export function buildJobForClient(record: BuildJobRecord): BuildJobRecord {
  const { artifactSnapshot: _artifactSnapshot, ...clientRecord } = record;
  return clientRecord;
}

function setJobStatus(record: BuildJobRecord, next: BuildJobRecord["status"]): void {
  assertBuildJobTransition(record.status, next);
  record.status = next;
}

async function removeIfExists(filePath: string): Promise<void> {
  try { await fs.unlink(filePath); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}
