import "server-only";

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { googlePlayFastlaneEnvironment } from "@/modules/google-play-console/domain/development-guard.server";
import { assertGooglePlayConsoleAllowed } from "@/modules/google-play-console/domain/development-guard.server";

import { BUILD_COMMAND_CATALOG, findBuildCommand } from "../domain/build-command-catalog";
import type { BuildCommandCatalogEntry } from "../domain/build-command-catalog";
import type { BuildJobRecord, StartBuildJobInput } from "../domain/build-job-types";
import { scanBuildJobArtifacts } from "./build-job-artifacts.server";

const JOB_DIR = path.join(process.cwd(), ".backups", "build-jobs");
const liveProcesses = new Map<string, ChildProcessWithoutNullStreams>();
let activeExclusiveJobId: string | null = null;

function now() {
  return new Date().toISOString();
}

function isExclusive(command: BuildCommandCatalogEntry) {
  return command.category === "native-android" || command.category === "ota" || command.category === "fastlane";
}

async function writeRecord(record: BuildJobRecord) {
  await fs.mkdir(JOB_DIR, { recursive: true });
  await fs.writeFile(path.join(JOB_DIR, `${record.id}.json`), JSON.stringify(record, null, 2), "utf8");
}

async function readRecord(jobId: string): Promise<BuildJobRecord> {
  return JSON.parse(await fs.readFile(path.join(JOB_DIR, `${jobId}.json`), "utf8")) as BuildJobRecord;
}

async function appendLog(jobId: string, chunk: string | Buffer) {
  await fs.mkdir(JOB_DIR, { recursive: true });
  await fs.appendFile(path.join(JOB_DIR, `${jobId}.log`), chunk);
}

export async function startBuildJob(input: StartBuildJobInput): Promise<BuildJobRecord> {
  assertGooglePlayConsoleAllowed();
  const command = findBuildCommand(input.commandId);
  if (!command) throw new Error("releaseCommandUnknown");
  if (command.danger === "publishes-live" && input.confirmationPhrase !== command.confirmationPhrase) {
    throw new Error("releaseCommandConfirmationRequired");
  }
  if (isExclusive(command) && activeExclusiveJobId) {
    throw new Error(`releaseCommandSingleFlightActive:${activeExclusiveJobId}`);
  }

  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record: BuildJobRecord = {
    id,
    commandId: command.id,
    command: {
      id: command.id,
      script: command.script,
      argv: [...command.argv, ...(input.extraArgs ?? [])],
      category: command.category,
      danger: command.danger,
    },
    status: "queued",
    queuedAt: now(),
    logPath: path.relative(process.cwd(), path.join(JOB_DIR, `${id}.log`)).replace(/\\/g, "/"),
  };
  await writeRecord(record);
  void runJob(record, command, input.extraArgs ?? []);
  return record;
}

export async function listBuildJobs(): Promise<{ catalog: typeof BUILD_COMMAND_CATALOG; jobs: BuildJobRecord[] }> {
  assertGooglePlayConsoleAllowed();
  await fs.mkdir(JOB_DIR, { recursive: true });
  const files = (await fs.readdir(JOB_DIR)).filter((file) => file.endsWith(".json"));
  const jobs = await Promise.all(files.map((file) => fs.readFile(path.join(JOB_DIR, file), "utf8").then((text) => JSON.parse(text) as BuildJobRecord)));
  return { catalog: BUILD_COMMAND_CATALOG, jobs: jobs.sort((left, right) => right.queuedAt.localeCompare(left.queuedAt)) };
}

export async function cancelBuildJob(jobId: string): Promise<BuildJobRecord> {
  assertGooglePlayConsoleAllowed();
  const child = liveProcesses.get(jobId);
  if (child?.pid) {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    } else {
      child.kill("SIGTERM");
    }
  }
  const record = await readRecord(jobId);
  record.status = "cancelled";
  record.finishedAt = now();
  await writeRecord(record);
  return record;
}

export async function readBuildJobLog(jobId: string, offset = 0) {
  assertGooglePlayConsoleAllowed();
  const logPath = path.join(JOB_DIR, `${jobId}.log`);
  const handle = await fs.open(logPath, "a+");
  try {
    const stat = await handle.stat();
    const start = Math.max(0, Math.min(offset, stat.size));
    const length = stat.size - start;
    const buffer = Buffer.alloc(length);
    if (length > 0) await handle.read(buffer, 0, length, start);
    return { offset: stat.size, text: buffer.toString("utf8") };
  } finally {
    await handle.close();
  }
}

export async function artifactsForJob(jobId: string) {
  assertGooglePlayConsoleAllowed();
  const record = await readRecord(jobId);
  return record.artifacts ?? scanBuildJobArtifacts();
}

async function runJob(record: BuildJobRecord, command: BuildCommandCatalogEntry, extraArgs: string[]) {
  const exclusive = isExclusive(command);
  if (exclusive) activeExclusiveJobId = record.id;
  record.status = "running";
  record.startedAt = now();
  await writeRecord(record);
  await appendLog(record.id, `> npm run ${command.script} ${[...command.argv, ...extraArgs].join(" ")}\n`);

  const child = spawn("npm", ["run", command.script, "--", ...command.argv, ...extraArgs], {
    cwd: process.cwd(),
    shell: process.platform === "win32",
    env: googlePlayFastlaneEnvironment(),
  });
  liveProcesses.set(record.id, child);
  child.stdout.on("data", (chunk) => void appendLog(record.id, chunk));
  child.stderr.on("data", (chunk) => void appendLog(record.id, chunk));
  child.on("error", async (error) => {
    record.status = "failed";
    record.error = error.message;
    record.finishedAt = now();
    await writeRecord(record);
  });
  child.on("close", async (code) => {
    liveProcesses.delete(record.id);
    if (exclusive && activeExclusiveJobId === record.id) activeExclusiveJobId = null;
    const latest = await readRecord(record.id);
    if (latest.status === "cancelled") return;
    latest.status = code === 0 ? "succeeded" : "failed";
    latest.exitCode = code;
    latest.finishedAt = now();
    latest.artifacts = await scanBuildJobArtifacts();
    await writeRecord(latest);
  });
}
