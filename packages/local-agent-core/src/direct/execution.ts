import { spawnSync } from "node:child_process";
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { cpus, freemem, hostname, platform, totalmem, uptime } from "node:os";
import path from "node:path";

import { declareAgent, heartbeat, listAgents, AgentRecord, AgentSnapshot } from "../agent-registry";
import { git, gitSoft, runCapture } from "../git";
import { acquireLock, listLocks, releaseLock, LockConflictError, LockSnapshot } from "../lock-store";
import { OperationLog } from "../operation-log";
import { relativeInsideWorkspace, workspaceDir } from "../paths";
import { isSecretPath, looksLikeSecretValue, patchSecretViolations } from "../secret-paths";
import { prepareWorktree, removeWorktree, worktreePath } from "../worktree";
import { assertCapability } from "./capabilities";
import { DirectAgentError } from "./errors";
import {
  DIRECT_LIMITS,
  DirectCoordinationDeclarePayload,
  DirectCoordinationHeartbeatPayload,
  DirectCoordinationLockPayload,
  DirectCoordinationStatusPayload,
  DirectCoordinationUnlockPayload,
  DirectExecRequestPayload,
  DirectInspectListRequestPayload,
  DirectInspectReadRequestPayload,
  DirectInspectSearchRequestPayload,
  DirectPatchApplyRequestPayload,
  DirectResponseEnvelope,
} from "./protocol";
import { DirectSession } from "./session";

export type DirectStreamSender = (event: DirectResponseEnvelope) => void;

function redactSecrets(text: string): string {
  // Redact token / key / secret patterns
  let redacted = text;
  const patterns = [
    /gh[pousr]_[A-Za-z0-9]{16,}/g,
    /github_pat_[A-Za-z0-9_]{20,}/g,
    /\bAKIA[0-9A-Z]{16}\b/g,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    /\b(?:secret|token|password|passwd|api[_-]?key)\s*[:=]\s*["']?([^\s"']{8,})["']?/gi,
  ];
  for (const pattern of patterns) {
    redacted = redacted.replace(pattern, (match, group) => {
      if (group) return match.replace(group, "[REDACTED_SECRET]");
      return "[REDACTED_SECRET]";
    });
  }
  return redacted;
}

export function resolveTargetDirectory(session: DirectSession, requestedCwd?: string, worktreeSlug?: string): string {
  const root = workspaceDir();
  let baseDir = root;

  if (worktreeSlug) {
    const wtPath = worktreePath(worktreeSlug);
    if (!existsSync(wtPath)) {
      throw new DirectAgentError("path-denied", `Worktree "${worktreeSlug}" does not exist.`);
    }
    baseDir = wtPath;
  }

  if (!requestedCwd) return baseDir;

  const rel = relativeInsideWorkspace(requestedCwd, baseDir);
  if (!rel) {
    throw new DirectAgentError("path-denied", `Target path "${requestedCwd}" escapes workspace bounds.`);
  }

  return path.resolve(baseDir, rel);
}

export async function executeStatus(session: DirectSession): Promise<Record<string, unknown>> {
  assertCapability(session.capabilities, "inspect");
  const root = workspaceDir();
  const branch = gitSoft(["branch", "--show-current"], root).trim() || "unknown";
  const headSha = gitSoft(["rev-parse", "HEAD"], root).trim() || "unknown";
  const locks = listLocks();
  const agents = listAgents();

  return {
    host: {
      hostname: hostname(),
      platform: platform(),
      uptimeSeconds: Math.round(uptime()),
      totalMemoryMb: Math.round(totalmem() / 1024 / 1024),
      freeMemoryMb: Math.round(freemem() / 1024 / 1024),
      cpuCount: cpus().length,
    },
    workspace: {
      path: root,
      branch,
      headSha,
    },
    coordination: {
      activeLocksCount: locks.length,
      activeAgentsCount: agents.length,
      locks: locks.slice(0, 20),
    },
    session: {
      sessionId: session.sessionId,
      agentId: session.agentId,
      capabilities: session.capabilities,
      expiresAt: session.expiresAt,
    },
  };
}

export async function executeInspectList(
  session: DirectSession,
  payload: DirectInspectListRequestPayload,
): Promise<{ entries: Array<{ name: string; isDirectory: boolean; size: number; path: string }> }> {
  assertCapability(session.capabilities, "inspect");
  const targetDir = resolveTargetDirectory(session, payload.path, payload.worktree);
  if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
    throw new DirectAgentError("path-denied", `Directory not found: "${payload.path ?? "."}"`);
  }

  const entries: Array<{ name: string; isDirectory: boolean; size: number; path: string }> = [];
  const files = readdirSync(targetDir, { withFileTypes: true });

  for (const entry of files) {
    const relFromRoot = relativeInsideWorkspace(path.join(targetDir, entry.name), workspaceDir());
    if (relFromRoot && isSecretPath(relFromRoot)) continue; // Redact secret paths
    if (entry.name === ".git" || entry.name === "node_modules") {
      entries.push({
        name: entry.name,
        isDirectory: true,
        size: 0,
        path: relFromRoot ?? entry.name,
      });
      continue;
    }

    try {
      const fullPath = path.join(targetDir, entry.name);
      const st = statSync(fullPath);
      entries.push({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        size: entry.isDirectory() ? 0 : st.size,
        path: relFromRoot ?? entry.name,
      });
    } catch {
      // ignore inaccessible file
    }
  }

  return { entries };
}

export async function executeInspectRead(
  session: DirectSession,
  payload: DirectInspectReadRequestPayload,
): Promise<{ path: string; content: string; truncated: boolean; size: number }> {
  assertCapability(session.capabilities, "inspect");
  if (!payload.path || typeof payload.path !== "string") {
    throw new DirectAgentError("invalid-message", "path is required for inspect.read.");
  }

  const root = workspaceDir();
  const relFromRoot = relativeInsideWorkspace(payload.path, root);
  if (!relFromRoot) {
    throw new DirectAgentError("path-denied", `Target path "${payload.path}" escapes workspace bounds.`);
  }

  if (isSecretPath(relFromRoot)) {
    throw new DirectAgentError("secret-export-denied", `Reading secret-bearing file "${relFromRoot}" is forbidden.`);
  }

  const targetPath = resolveTargetDirectory(session, payload.path, payload.worktree);
  if (!existsSync(targetPath) || !statSync(targetPath).isFile()) {
    throw new DirectAgentError("path-denied", `File not found: "${payload.path}"`);
  }

  const maxBytes = Math.min(payload.maxBytes ?? DIRECT_LIMITS.maxInspectReadBytes, DIRECT_LIMITS.maxInspectReadBytes);
  const buffer = readFileSync(targetPath);
  const truncated = buffer.length > maxBytes;
  const slice = buffer.subarray(0, maxBytes);
  const content = redactSecrets(slice.toString("utf8"));

  return {
    path: relFromRoot,
    content,
    truncated,
    size: buffer.length,
  };
}

export async function executeInspectSearch(
  session: DirectSession,
  payload: DirectInspectSearchRequestPayload,
): Promise<{ results: Array<{ file: string; line?: number; match?: string }>; totalMatches: number }> {
  assertCapability(session.capabilities, "inspect");
  if (!payload.query || typeof payload.query !== "string") {
    throw new DirectAgentError("invalid-message", "query is required for inspect.search.");
  }

  const targetDir = resolveTargetDirectory(session, payload.path, payload.worktree);
  const args = [
    "--color=never",
    "--line-number",
    "--max-count",
    "50",
    "--max-filesize",
    "2M",
    "--glob",
    "!.git/*",
    "--glob",
    "!node_modules/*",
    "--glob",
    "!.local/*",
  ];

  if (!payload.caseSensitive) args.push("--ignore-case");
  args.push("--", payload.query, targetDir);

  const result = runCapture("rg", args, targetDir);
  const lines = result.stdout.split("\n").filter((line) => line.trim());
  const results: Array<{ file: string; line?: number; match?: string }> = [];

  for (const line of lines.slice(0, DIRECT_LIMITS.maxSearchResults)) {
    const parts = line.split(":");
    if (parts.length >= 3) {
      const file = relativeInsideWorkspace(parts[0], workspaceDir()) ?? parts[0];
      if (isSecretPath(file)) continue;
      const lineNum = Number(parts[1]);
      const snippet = redactSecrets(parts.slice(2).join(":").trim());
      results.push({ file, line: lineNum, match: snippet });
    }
  }

  return { results, totalMatches: lines.length };
}

export async function executeGitStatus(
  session: DirectSession,
  payload: { worktree?: string },
): Promise<{ branch: string; headSha: string; porcelain: string; clean: boolean }> {
  assertCapability(session.capabilities, "inspect");
  const targetDir = resolveTargetDirectory(session, undefined, payload.worktree);
  const branch = gitSoft(["branch", "--show-current"], targetDir).trim();
  const headSha = gitSoft(["rev-parse", "HEAD"], targetDir).trim();
  const porcelain = gitSoft(["status", "--porcelain"], targetDir);

  return {
    branch,
    headSha,
    porcelain,
    clean: porcelain.trim().length === 0,
  };
}

export async function executeExec(
  session: DirectSession,
  requestId: string,
  payload: DirectExecRequestPayload,
  sendEvent: DirectStreamSender,
  abortSignal?: AbortSignal,
): Promise<{ exitCode: number; durationMs: number }> {
  assertCapability(session.capabilities, "execute");
  if (!payload.command || typeof payload.command !== "string") {
    throw new DirectAgentError("invalid-message", "command is required for exec.");
  }

  const targetDir = resolveTargetDirectory(session, payload.cwd, payload.worktree);
  const timeoutMs = Math.min(payload.timeoutMs ?? DIRECT_LIMITS.defaultExecTimeoutMs, DIRECT_LIMITS.maxExecTimeoutMs);
  const startedAt = Date.now();

  sendEvent({
    protocol: "gova-direct/1",
    sessionId: session.sessionId,
    requestId,
    sequence: 1,
    timestamp: new Date().toISOString(),
    event: "started",
    payload: { command: payload.command, cwd: targetDir },
  });

  return new Promise((resolve, reject) => {
    let child: ReturnType<typeof spawn> | null = null;
    let timer: NodeJS.Timeout | null = null;
    let sequence = 2;
    let totalOutBytes = 0;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
    };

    try {
      child = spawn("/bin/bash", ["-lc", payload.command], {
        cwd: targetDir,
        env: {
          ...process.env,
          ...(payload.env ?? {}),
          GOVA_DIRECT_SESSION_ID: session.sessionId,
          GOVA_DIRECT_AGENT_ID: session.agentId,
        },
      });
    } catch (err) {
      cleanup();
      reject(new DirectAgentError("internal-error", `Failed to spawn process: ${String(err)}`));
      return;
    }

    if (abortSignal) {
      abortSignal.addEventListener("abort", () => {
        if (child && !child.killed) {
          child.kill("SIGTERM");
          setTimeout(() => {
            if (child && !child.killed) child.kill("SIGKILL");
          }, 2000);
        }
      });
    }

    timer = setTimeout(() => {
      if (child && !child.killed) {
        child.kill("SIGTERM");
        setTimeout(() => {
          if (child && !child.killed) child.kill("SIGKILL");
        }, 2000);
      }
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = redactSecrets(chunk.toString("utf8"));
      totalOutBytes += chunk.length;
      if (totalOutBytes <= DIRECT_LIMITS.maxBufferedOutputBytes) {
        sendEvent({
          protocol: "gova-direct/1",
          sessionId: session.sessionId,
          requestId,
          sequence: sequence++,
          timestamp: new Date().toISOString(),
          event: "stdout",
          payload: { text },
        });
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = redactSecrets(chunk.toString("utf8"));
      totalOutBytes += chunk.length;
      if (totalOutBytes <= DIRECT_LIMITS.maxBufferedOutputBytes) {
        sendEvent({
          protocol: "gova-direct/1",
          sessionId: session.sessionId,
          requestId,
          sequence: sequence++,
          timestamp: new Date().toISOString(),
          event: "stderr",
          payload: { text },
        });
      }
    });

    child.on("error", (err) => {
      cleanup();
      reject(new DirectAgentError("internal-error", `Child process error: ${err.message}`));
    });

    child.on("close", (code, signal) => {
      cleanup();
      const durationMs = Date.now() - startedAt;
      const exitCode = signal ? 128 + 15 : code ?? 0;

      if (abortSignal?.aborted) {
        sendEvent({
          protocol: "gova-direct/1",
          sessionId: session.sessionId,
          requestId,
          sequence: sequence++,
          timestamp: new Date().toISOString(),
          event: "cancelled",
          payload: { durationMs, exitCode },
        });
        resolve({ exitCode, durationMs });
        return;
      }

      sendEvent({
        protocol: "gova-direct/1",
        sessionId: session.sessionId,
        requestId,
        sequence: sequence++,
        timestamp: new Date().toISOString(),
        event: "result",
        payload: { exitCode, durationMs, signal },
      });

      sendEvent({
        protocol: "gova-direct/1",
        sessionId: session.sessionId,
        requestId,
        sequence: sequence++,
        timestamp: new Date().toISOString(),
        event: "finished",
        payload: { exitCode, durationMs },
      });

      resolve({ exitCode, durationMs });
    });
  });
}

export async function executePatchApply(
  session: DirectSession,
  payload: DirectPatchApplyRequestPayload,
): Promise<{ applied: boolean; targetDir: string; changedFiles: string[] }> {
  const isMain = payload.targetMode === "main";
  assertCapability(session.capabilities, isMain ? "mutate-main" : "mutate-worktree");

  if (!payload.patch || typeof payload.patch !== "string") {
    throw new DirectAgentError("invalid-message", "patch content is required.");
  }

  // 1. Secret violations check
  const violations = patchSecretViolations(payload.patch);
  if (violations.length > 0) {
    throw new DirectAgentError(
      "secret-export-denied",
      `Patch attempts to modify forbidden secret paths: [${violations.join(", ")}]`,
      { violations },
    );
  }

  // 2. Lock scope
  const lockScope = payload.lockScope ?? (isMain ? "ref:main" : `worktree:${payload.worktreeSlug ?? session.sessionId}`);
  const lockKind = lockScope.startsWith("ref:") ? "ref" : "path";
  const lock = acquireLock({
    agentId: session.agentId,
    kind: lockKind,
    scope: lockScope,
    note: payload.note ?? `Direct agent patch apply by ${session.agentId}`,
    processBound: false,
  });

  // 3. Resolve target directory / worktree
  let targetDir = workspaceDir();
  if (!isMain) {
    const slug = payload.worktreeSlug ?? `direct-${session.agentId}-${session.sessionId.slice(-8)}`;
    const prepared = prepareWorktree(slug);
    targetDir = prepared.worktree;
  }

  // 4. Apply patch using git apply
  const applyRes = spawnSync("git", ["apply", "--whitespace=nowarn", "-"], { cwd: targetDir, input: payload.patch, encoding: "utf8" });
  if (applyRes.status !== 0) {
    throw new DirectAgentError("internal-error", `Failed to apply patch: ${applyRes.stderr || applyRes.stdout}`);
  }

  const status = gitSoft(["status", "--porcelain"], targetDir);
  const changedFiles = status
    .split("\n")
    .map((line) => line.slice(3).trim())
    .filter(Boolean);

  return {
    applied: true,
    targetDir,
    changedFiles,
  };
}

export async function executeCoordinationDeclare(
  session: DirectSession,
  payload: DirectCoordinationDeclarePayload,
): Promise<AgentRecord> {
  assertCapability(session.capabilities, "coordinate");
  return declareAgent({
    agentId: payload.agentId || session.agentId,
    origin: "direct",
    task: payload.task,
    status: payload.status ?? "active",
  });
}

export async function executeCoordinationHeartbeat(
  session: DirectSession,
  payload: DirectCoordinationHeartbeatPayload,
): Promise<AgentRecord> {
  assertCapability(session.capabilities, "coordinate");
  return heartbeat(payload.agentId || session.agentId, payload.status);
}

export async function executeCoordinationLock(
  session: DirectSession,
  payload: DirectCoordinationLockPayload,
): Promise<{ lockId: string; scope: string; kind: string; reentrant: boolean }> {
  assertCapability(session.capabilities, "coordinate");
  try {
    const res = acquireLock({
      agentId: session.agentId,
      kind: payload.kind,
      scope: payload.scope,
      ttlMs: payload.ttlMs,
      note: payload.note,
      processBound: payload.processBound ?? false,
    });
    return {
      lockId: res.lock.lockId,
      scope: res.lock.scope,
      kind: res.lock.kind,
      reentrant: res.reentrant,
    };
  } catch (err) {
    if (err instanceof LockConflictError) {
      throw new DirectAgentError("lock-conflict", err.message, { scope: payload.scope, conflictingLock: err.holder });
    }
    throw err;
  }
}

export async function executeCoordinationUnlock(
  session: DirectSession,
  payload: DirectCoordinationUnlockPayload,
): Promise<{ released: boolean; scope: string; kind: string }> {
  assertCapability(session.capabilities, "coordinate");
  const released = releaseLock(session.agentId, payload.kind, payload.scope);
  return { released, scope: payload.scope, kind: payload.kind };
}

export async function executeCoordinationStatus(
  session: DirectSession,
  payload: DirectCoordinationStatusPayload,
): Promise<{ locks: LockSnapshot[]; agents: AgentSnapshot[] }> {
  assertCapability(session.capabilities, "coordinate");
  const locks = listLocks();
  const agents = listAgents();
  return {
    locks: payload.scope ? locks.filter((l) => l.scope.includes(payload.scope!)) : locks,
    agents,
  };
}
