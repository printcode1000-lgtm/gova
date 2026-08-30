import { hostname } from "node:os";
import path from "node:path";

import { readJsonDir, readJsonFile, safeIdentifier, writeJsonFile } from "./json-store";
import { agentsDir } from "./paths";

/**
 * Agent identity, work declaration, and heartbeat.
 *
 * Cloud and local agents register the same way: one record per `agentId`
 * carrying what the agent intends to touch and when it last reported in. A
 * record whose heartbeat has expired is `stale`, which is what lets lock
 * recovery and cleanup act without a human in the loop.
 */

export const DEFAULT_HEARTBEAT_TTL_MS = 15 * 60 * 1000;
export const IDLE_HEARTBEAT_MS = 5 * 60 * 1000;

export type AgentLiveness = "active" | "idle" | "stale";

export interface AgentRecord {
  agentId: string;
  origin: string;
  task: string;
  scopes: string[];
  branch: string | null;
  status: string;
  host: string;
  startedAt: string;
  heartbeatAt: string;
  heartbeatTtlMs: number;
  lastRunId: string | null;
}

export interface AgentSnapshot extends AgentRecord {
  liveness: AgentLiveness;
  heartbeatAgeMs: number;
}

export function normalizeAgentId(value: string): string {
  return safeIdentifier(value, 48) || "agent";
}

function agentPath(agentId: string): string {
  return path.join(agentsDir(), `${normalizeAgentId(agentId)}.json`);
}

export function readAgent(agentId: string): AgentRecord | null {
  return readJsonFile<AgentRecord>(agentPath(agentId));
}

export interface DeclareInput {
  agentId: string;
  origin?: string;
  task?: string;
  scopes?: string[];
  branch?: string | null;
  status?: string;
  runId?: string | null;
  heartbeatTtlMs?: number;
}

/** Create or refresh an agent's declaration; heartbeat is stamped either way. */
export function declareAgent(input: DeclareInput, now = Date.now()): AgentRecord {
  const agentId = normalizeAgentId(input.agentId);
  const previous = readAgent(agentId);
  const record: AgentRecord = {
    agentId,
    origin: input.origin ?? previous?.origin ?? "unknown",
    task: input.task ?? previous?.task ?? "",
    scopes: input.scopes ?? previous?.scopes ?? [],
    branch: input.branch ?? previous?.branch ?? null,
    status: input.status ?? previous?.status ?? "active",
    host: hostname(),
    startedAt: previous?.startedAt ?? new Date(now).toISOString(),
    heartbeatAt: new Date(now).toISOString(),
    heartbeatTtlMs: input.heartbeatTtlMs ?? previous?.heartbeatTtlMs ?? DEFAULT_HEARTBEAT_TTL_MS,
    lastRunId: input.runId ?? previous?.lastRunId ?? null,
  };
  writeJsonFile(agentPath(agentId), record);
  return record;
}

export function heartbeat(agentId: string, status?: string, now = Date.now()): AgentRecord {
  return declareAgent({ agentId, status }, now);
}

export function livenessOf(record: AgentRecord, now = Date.now()): AgentLiveness {
  const ageMs = now - Date.parse(record.heartbeatAt);
  if (!Number.isFinite(ageMs)) return "stale";
  if (ageMs > record.heartbeatTtlMs) return "stale";
  return ageMs > IDLE_HEARTBEAT_MS ? "idle" : "active";
}

export function listAgents(now = Date.now()): AgentSnapshot[] {
  return readJsonDir<AgentRecord>(agentsDir())
    .map((record) => ({
      ...record,
      liveness: livenessOf(record, now),
      heartbeatAgeMs: Math.max(0, now - Date.parse(record.heartbeatAt)),
    }))
    .sort((left, right) => left.agentId.localeCompare(right.agentId));
}

export function isAgentAlive(agentId: string, now = Date.now()): boolean {
  const record = readAgent(agentId);
  return record !== null && livenessOf(record, now) !== "stale";
}
