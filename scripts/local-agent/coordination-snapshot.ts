import { listAgents } from "./agent-registry";
import { listLocks } from "./lock-store";
import { listMessages } from "./message-store";
import { listOperations } from "./operation-log";
import { listRequests } from "./request-store";

/**
 * The cloud-readable view of the control plane.
 *
 * Everything a remote agent needs to coordinate — who is active, what is locked,
 * what was requested, what ran — reduced to fields that are safe to publish.
 * Host names, process ids, and filesystem paths stay local; nothing here carries
 * patch text, shell commands, or credentials.
 */

export interface CoordinationSnapshot {
  generatedAt: string;
  agents: Array<{
    agentId: string;
    origin: string;
    task: string;
    scopes: string[];
    branch: string | null;
    status: string;
    liveness: string;
    heartbeatAt: string;
    heartbeatAgeMs: number;
  }>;
  locks: Array<{
    lockId: string;
    agentId: string;
    kind: string;
    scope: string;
    acquiredAt: string;
    ageMs: number;
    stale: boolean;
  }>;
  messages: Array<{
    messageId: string;
    from: string;
    to: string;
    kind: string;
    body: string;
    scope: string | null;
    createdAt: string;
  }>;
  requests: Array<{
    requestId: string;
    agentId: string;
    workflow: string;
    mode: string;
    outcome: string;
    createdAt: string;
    receivedAt: string;
    errors: string[];
  }>;
  operations: Array<{
    requestId: string | null;
    agentId: string;
    workflow: string;
    targetMode: string;
    targetRef: string;
    runId: string;
    runnerName: string | null;
    startingSha: string | null;
    resultingSha: string | null;
    changedFiles: string[];
    startedAt: string;
    completedAt: string | null;
    durationMs: number;
    verification: string;
    status: string;
    exitCode: number | null;
    staleLockRecovered: boolean;
    retryCount: number;
  }>;
}

export interface SnapshotOptions {
  messageLimit?: number;
  requestLimit?: number;
  operationLimit?: number;
  now?: number;
}

export function buildCoordinationSnapshot(options: SnapshotOptions = {}): CoordinationSnapshot {
  const now = options.now ?? Date.now();
  return {
    generatedAt: new Date(now).toISOString(),
    agents: listAgents(now).map((agent) => ({
      agentId: agent.agentId,
      origin: agent.origin,
      task: agent.task,
      scopes: agent.scopes,
      branch: agent.branch,
      status: agent.status,
      liveness: agent.liveness,
      heartbeatAt: agent.heartbeatAt,
      heartbeatAgeMs: agent.heartbeatAgeMs,
    })),
    locks: listLocks(now).map((lock) => ({
      lockId: lock.lockId,
      agentId: lock.agentId,
      kind: lock.kind,
      scope: lock.scope,
      acquiredAt: lock.acquiredAt,
      ageMs: lock.ageMs,
      stale: lock.stale,
    })),
    messages: listMessages({ limit: options.messageLimit ?? 50 }),
    requests: listRequests(options.requestLimit ?? 50).map((request) => ({
      requestId: request.requestId,
      agentId: request.agentId,
      workflow: request.workflow,
      mode: request.mode,
      outcome: request.outcome,
      createdAt: request.createdAt,
      receivedAt: request.receivedAt,
      errors: request.errors,
    })),
    operations: listOperations(options.operationLimit ?? 30).map((operation) => ({
      requestId: operation.requestId,
      agentId: operation.agentId,
      workflow: operation.workflow,
      targetMode: operation.targetMode,
      targetRef: operation.targetRef,
      runId: operation.runId,
      runnerName: operation.runnerName,
      startingSha: operation.startingSha,
      resultingSha: operation.resultingSha,
      changedFiles: operation.changedFiles,
      startedAt: operation.startedAt,
      completedAt: operation.completedAt,
      durationMs: operation.durationMs,
      verification: operation.verification,
      status: operation.status,
      exitCode: operation.exitCode,
      staleLockRecovered: operation.staleLockRecovered,
      retryCount: operation.retryCount,
    })),
  };
}
