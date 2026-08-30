import path from "node:path";

import { listJsonFiles, readJsonDir, readJsonFile, safeIdentifier, writeJsonFile } from "./json-store";
import { requestsDir } from "./paths";
import type { DispatchRequest } from "./request-contract";

/**
 * The processed-request ledger.
 *
 * One record per `requestId`, which is what makes duplicate execution
 * detectable: the gateway consults this ledger before dispatching and writes to
 * it immediately afterwards.
 */

export type RequestOutcome = "accepted" | "rejected" | "dispatched" | "failed";

export interface RequestRecord {
  requestId: string;
  agentId: string;
  workflow: string;
  mode: string;
  ref: string;
  inputKeys: string[];
  createdAt: string;
  receivedAt: string;
  outcome: RequestOutcome;
  errors: string[];
  dispatchedAt: string | null;
  gatewayRunId: string | null;
}

function requestPath(requestId: string): string {
  return path.join(requestsDir(), `${safeIdentifier(requestId, 64)}.json`);
}

export function knownRequestIds(): Set<string> {
  return new Set(
    listJsonFiles(requestsDir()).map((filePath) => path.basename(filePath, ".json")),
  );
}

export function readRequest(requestId: string): RequestRecord | null {
  return readJsonFile<RequestRecord>(requestPath(requestId));
}

export function listRequests(limit = 100): RequestRecord[] {
  return readJsonDir<RequestRecord>(requestsDir())
    .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt))
    .slice(0, limit);
}

export interface RecordInput {
  requestId: string;
  agentId: string;
  workflow: string;
  mode: string;
  ref: string;
  inputKeys: string[];
  createdAt: string;
  outcome: RequestOutcome;
  errors?: string[];
  gatewayRunId?: string | null;
}

/**
 * Persist the outcome of one request. Input *values* are never stored — only
 * their keys — so a patch body or a shell command cannot leak through the
 * ledger into the snapshot cloud agents read.
 */
export function recordRequest(input: RecordInput, now = Date.now()): RequestRecord {
  const record: RequestRecord = {
    requestId: input.requestId,
    agentId: input.agentId,
    workflow: input.workflow,
    mode: input.mode,
    ref: input.ref,
    inputKeys: [...input.inputKeys].sort(),
    createdAt: input.createdAt,
    receivedAt: new Date(now).toISOString(),
    outcome: input.outcome,
    errors: input.errors ?? [],
    dispatchedAt: input.outcome === "dispatched" ? new Date(now).toISOString() : null,
    gatewayRunId: input.gatewayRunId ?? null,
  };
  writeJsonFile(requestPath(record.requestId), record);
  return record;
}

export function recordFromRequest(
  request: DispatchRequest,
  outcome: RequestOutcome,
  extra: { errors?: string[]; gatewayRunId?: string | null } = {},
  now = Date.now(),
): RequestRecord {
  return recordRequest(
    {
      requestId: request.requestId,
      agentId: request.agentId,
      workflow: request.workflow,
      mode: request.mode,
      ref: request.ref,
      inputKeys: Object.keys(request.inputs),
      createdAt: request.createdAt,
      outcome,
      errors: extra.errors,
      gatewayRunId: extra.gatewayRunId,
    },
    now,
  );
}
