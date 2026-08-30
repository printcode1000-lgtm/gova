import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { listAgents, type AgentSnapshot } from "./agent-registry";
import { maxConcurrentMutations, memoryFloorMb, memoryFloorReason, readMemory, type MemoryReading } from "./admission";
import { gitSoft } from "./git";
import type { ActiveJob, RunnerSummary } from "./github-api";
import { hostToolState } from "./host-tools";
import { listLocks, type LockSnapshot } from "./lock-store";
import { listMessages, type MessageRecord } from "./message-store";
import { isOpen, listOperations, type OperationRecord } from "./operation-log";
import {
  RUNNER_GITHUB_NAMES,
  RUNNER_SERVICE_NAMES,
  coordinationDir,
  runnerPoolDir,
  workspaceDir,
  worktreesDir,
} from "./paths";
import { readRemoteHostsCache, type RemoteHostProbe } from "./remote-hosts";
import { listRequests, type RequestRecord } from "./request-store";

/**
 * The observable state of the local server, assembled without touching it.
 *
 * Every field here comes from reading: JSON records in the coordination
 * directory, `systemctl --user is-active`, a few `git` queries that do not
 * fetch, and whatever the caller already retrieved from GitHub. Nothing in this
 * module writes a file, takes a lock, registers an agent, refreshes a heartbeat,
 * or dispatches a job — the monitor must never appear in the state it reports.
 */

export interface RunnerView {
  githubName: string;
  serviceName: string;
  serviceActive: boolean;
  githubStatus: string | null;
  busy: boolean;
  job: ActiveJob | null;
}

export interface WatchModel {
  sampledAt: number;
  workspace: string;
  poolDir: string;
  coordinationDir: string;
  git: { branch: string; head: string; originMain: string; dirtyCount: number; behind: boolean };
  runners: RunnerView[];
  agents: AgentSnapshot[];
  locks: LockSnapshot[];
  running: OperationRecord[];
  finished: OperationRecord[];
  messages: MessageRecord[];
  requests: RequestRecord[];
  worktrees: string[];
  memory: { reading: MemoryReading | null; floorMb: number; floorReason: string | null; budget: number };
  hostTools: ReturnType<typeof hostToolState>;
  remoteHosts: RemoteHostProbe[];
  github: { enabled: boolean; error: string | null; lastPolledAt: number | null };
}

export interface GithubSample {
  runners: RunnerSummary[];
  jobs: ActiveJob[];
  error: string | null;
  polledAt: number | null;
}

export const EMPTY_GITHUB_SAMPLE: GithubSample = { runners: [], jobs: [], error: null, polledAt: null };

function serviceActive(serviceName: string): boolean {
  try {
    return execFileSync("systemctl", ["--user", "is-active", serviceName], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() === "active";
  } catch {
    return false;
  }
}

/**
 * Git facts that cost nothing.
 *
 * Deliberately no `git fetch`: the monitor must not touch the network on the
 * repository's behalf, and must not race a job that is mid-fetch. `origin/main`
 * is whatever the last agent job already brought down.
 */
function gitFacts(workspace: string): WatchModel["git"] {
  const head = gitSoft(["rev-parse", "HEAD"], workspace);
  const originMain = gitSoft(["rev-parse", "origin/main"], workspace);
  return {
    branch: gitSoft(["branch", "--show-current"], workspace) || "detached",
    head,
    originMain,
    dirtyCount: gitSoft(["status", "--porcelain"], workspace).split("\n").filter(Boolean).length,
    behind: Boolean(head && originMain && head !== originMain),
  };
}

function agentWorktrees(): string[] {
  const root = worktreesDir();
  if (!existsSync(root)) return [];
  return gitSoft(["worktree", "list", "--porcelain"], workspaceDir())
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length))
    .filter((candidate) => candidate.startsWith(root))
    .map((candidate) => path.basename(candidate));
}

export function buildWatchModel(github: GithubSample = EMPTY_GITHUB_SAMPLE, now = Date.now()): WatchModel {
  const workspace = workspaceDir();
  const operations = listOperations(60);
  const memory = readMemory();
  const byRunner = new Map<string, ActiveJob>();
  for (const job of github.jobs) {
    if (job.runnerName) byRunner.set(job.runnerName, job);
  }
  const githubByName = new Map(github.runners.map((runner) => [runner.name, runner]));

  return {
    sampledAt: now,
    workspace,
    poolDir: runnerPoolDir(),
    coordinationDir: coordinationDir(),
    git: gitFacts(workspace),
    runners: RUNNER_GITHUB_NAMES.map((githubName, index) => {
      const remote = githubByName.get(githubName);
      return {
        githubName,
        serviceName: RUNNER_SERVICE_NAMES[index]!,
        serviceActive: serviceActive(RUNNER_SERVICE_NAMES[index]!),
        githubStatus: remote?.status ?? null,
        busy: Boolean(remote?.busy),
        job: byRunner.get(githubName) ?? null,
      };
    }),
    agents: listAgents(now),
    locks: listLocks(now),
    running: operations.filter((operation) => isOpen(operation.status)),
    finished: operations.filter((operation) => !isOpen(operation.status)).slice(0, 12),
    messages: listMessages({ limit: 8 }),
    requests: listRequests(8),
    worktrees: agentWorktrees(),
    memory: { reading: memory, floorMb: memoryFloorMb(memory), floorReason: memoryFloorReason(memory), budget: maxConcurrentMutations() },
    hostTools: hostToolState(),
    remoteHosts: readRemoteHostsCache(),
    github: { enabled: github.polledAt !== null, error: github.error, lastPolledAt: github.polledAt },
  };
}
