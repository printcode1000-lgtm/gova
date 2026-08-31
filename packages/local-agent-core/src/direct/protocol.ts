import { DirectCapability } from "./capabilities";
import { DirectErrorPayload } from "./errors";

export const DIRECT_PROTOCOL_VERSION = "gova-direct/1";

export const DIRECT_LIMITS = {
  maxRequestBodyBytes: 10 * 1024 * 1024,      // 10 MB
  maxPatchBytes: 5 * 1024 * 1024,              // 5 MB
  maxStreamChunkBytes: 64 * 1024,              // 64 KB
  maxBufferedOutputBytes: 8 * 1024 * 1024,      // 8 MB
  maxInspectReadBytes: 2 * 1024 * 1024,        // 2 MB
  maxSearchResults: 500,
  defaultExecTimeoutMs: 10 * 60 * 1000,        // 10 minutes
  maxExecTimeoutMs: 60 * 60 * 1000,            // 60 minutes
  bootstrapValidityMs: 5 * 60 * 1000,          // 5 minutes
  sessionIdleTimeoutMs: 15 * 60 * 1000,        // 15 minutes
  sessionMaxLifetimeMs: 60 * 60 * 1000,        // 60 minutes
  maxClockSkewMs: 5 * 60 * 1000,               // 5 minutes
} as const;

export const DIRECT_OPERATION_TYPES = [
  "handshake.request",
  "handshake.response",
  "status",
  "inspect.list",
  "inspect.read",
  "inspect.search",
  "git.status",
  "exec",
  "patch.apply",
  "coordination.declare",
  "coordination.heartbeat",
  "coordination.lock",
  "coordination.unlock",
  "coordination.status",
  "operation.cancel",
  "session.close",
] as const;

export type DirectOperationType = (typeof DIRECT_OPERATION_TYPES)[number];

export const DIRECT_STREAM_EVENT_TYPES = [
  "accepted",
  "started",
  "stdout",
  "stderr",
  "progress",
  "result",
  "error",
  "cancelled",
  "finished",
] as const;

export type DirectStreamEventType = (typeof DIRECT_STREAM_EVENT_TYPES)[number];

/**
 * Standard request envelope for all direct-agent operations.
 */
export interface DirectRequestEnvelope<T = unknown> {
  protocol: typeof DIRECT_PROTOCOL_VERSION;
  sessionId: string;
  requestId: string;
  sequence: number;
  timestamp: string;
  nonce: string;
  type: DirectOperationType;
  payload: T;
}

/**
 * Streaming event / response envelope sent by server.
 */
export interface DirectResponseEnvelope<T = unknown> {
  protocol: typeof DIRECT_PROTOCOL_VERSION;
  sessionId: string;
  requestId: string;
  sequence: number;
  timestamp: string;
  event: DirectStreamEventType;
  payload?: T;
  error?: DirectErrorPayload;
}

// Handshake payloads
export interface DirectHandshakeRequestPayload {
  bootstrapRequestId: string;
  sessionId: string;
  clientEphemeralPublicKey: string;
  signature: string; // client signature proving possession of ephemeral key
}

export interface DirectHandshakeResponsePayload {
  status: "authenticated";
  sessionId: string;
  agentId: string;
  expiresAt: string;
  capabilities: DirectCapability[];
  serverIdentity: {
    hostId: string;
    serverKeyId: string;
    signature: string;
  };
}

// Operation payloads
export interface DirectStatusRequestPayload {
  includeSystemInfo?: boolean;
}

export interface DirectInspectListRequestPayload {
  path?: string;
  maxDepth?: number;
  worktree?: string;
}

export interface DirectInspectReadRequestPayload {
  path: string;
  maxBytes?: number;
  worktree?: string;
}

export interface DirectInspectSearchRequestPayload {
  query: string;
  path?: string;
  caseSensitive?: boolean;
  maxResults?: number;
  worktree?: string;
}

export interface DirectGitStatusRequestPayload {
  worktree?: string;
}

export interface DirectExecRequestPayload {
  command: string;
  cwd?: string;
  worktree?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
}

export interface DirectPatchApplyRequestPayload {
  patch: string;
  targetMode?: "main" | "worktree";
  worktreeSlug?: string;
  lockScope?: string;
  note?: string;
}

export interface DirectCoordinationDeclarePayload {
  agentId: string;
  task: string;
  status?: string;
}

export interface DirectCoordinationHeartbeatPayload {
  agentId: string;
  task?: string;
  status?: string;
}

export interface DirectCoordinationLockPayload {
  kind: "path" | "module" | "ref";
  scope: string;
  ttlMs?: number;
  note?: string;
  processBound?: boolean;
}

export interface DirectCoordinationUnlockPayload {
  kind: "path" | "module" | "ref";
  scope: string;
}

export interface DirectCoordinationStatusPayload {
  scope?: string;
}

export interface DirectOperationCancelPayload {
  targetRequestId: string;
  reason?: string;
}

export interface DirectSessionClosePayload {
  reason?: string;
}

export function validateOperationPayload(
  type: DirectOperationType,
  payload: unknown,
): { valid: boolean; error?: string } {
  if (payload === undefined || payload === null || typeof payload !== "object") {
    return { valid: false, error: "payload must be a non-null JSON object." };
  }

  const p = payload as Record<string, unknown>;

  switch (type) {
    case "handshake.request": {
      if (typeof p.bootstrapRequestId !== "string" || !p.bootstrapRequestId.trim()) {
        return { valid: false, error: "handshake.request requires bootstrapRequestId." };
      }
      if (typeof p.sessionId !== "string" || !p.sessionId.trim()) {
        return { valid: false, error: "handshake.request requires sessionId." };
      }
      if (typeof p.clientEphemeralPublicKey !== "string" || !p.clientEphemeralPublicKey.includes("PUBLIC KEY")) {
        return { valid: false, error: "handshake.request requires clientEphemeralPublicKey (PEM)." };
      }
      if (typeof p.signature !== "string" || p.signature.length < 32) {
        return { valid: false, error: "handshake.request requires a shared-secret proof." };
      }
      return { valid: true };
    }
    case "handshake.response": {
      if (p.status !== "authenticated" || typeof p.sessionId !== "string") {
        return { valid: false, error: "Invalid handshake.response payload." };
      }
      return { valid: true };
    }
    case "status":
      return { valid: true };
    case "inspect.list": {
      if (p.path !== undefined && typeof p.path !== "string") {
        return { valid: false, error: "inspect.list path must be a string." };
      }
      return { valid: true };
    }
    case "inspect.read": {
      if (typeof p.path !== "string" || !p.path.trim()) {
        return { valid: false, error: "inspect.read requires non-empty path." };
      }
      return { valid: true };
    }
    case "inspect.search": {
      if (typeof p.query !== "string" || !p.query.trim()) {
        return { valid: false, error: "inspect.search requires non-empty query." };
      }
      return { valid: true };
    }
    case "git.status":
      return { valid: true };
    case "exec": {
      if (typeof p.command !== "string" || !p.command.trim()) {
        return { valid: false, error: "exec requires non-empty command." };
      }
      if (p.timeoutMs !== undefined && (typeof p.timeoutMs !== "number" || p.timeoutMs <= 0)) {
        return { valid: false, error: "exec timeoutMs must be a positive integer." };
      }
      return { valid: true };
    }
    case "patch.apply": {
      if (typeof p.patch !== "string" || !p.patch.trim()) {
        return { valid: false, error: "patch.apply requires non-empty patch." };
      }
      if (p.targetMode !== undefined && p.targetMode !== "main" && p.targetMode !== "worktree") {
        return { valid: false, error: 'patch.apply targetMode must be "main" or "worktree".' };
      }
      return { valid: true };
    }
    case "coordination.declare": {
      if (typeof p.agentId !== "string" || !p.agentId.trim()) {
        return { valid: false, error: "coordination.declare requires agentId." };
      }
      if (typeof p.task !== "string" || !p.task.trim()) {
        return { valid: false, error: "coordination.declare requires task." };
      }
      return { valid: true };
    }
    case "coordination.heartbeat": {
      if (typeof p.agentId !== "string" || !p.agentId.trim()) {
        return { valid: false, error: "coordination.heartbeat requires agentId." };
      }
      return { valid: true };
    }
    case "coordination.lock": {
      if (p.kind !== "path" && p.kind !== "module" && p.kind !== "ref") {
        return { valid: false, error: 'coordination.lock kind must be "path", "module", or "ref".' };
      }
      if (typeof p.scope !== "string" || !p.scope.trim()) {
        return { valid: false, error: "coordination.lock requires non-empty scope." };
      }
      return { valid: true };
    }
    case "coordination.unlock": {
      if (p.kind !== "path" && p.kind !== "module" && p.kind !== "ref") {
        return { valid: false, error: 'coordination.unlock kind must be "path", "module", or "ref".' };
      }
      if (typeof p.scope !== "string" || !p.scope.trim()) {
        return { valid: false, error: "coordination.unlock requires non-empty scope." };
      }
      return { valid: true };
    }
    case "coordination.status":
      return { valid: true };
    case "operation.cancel": {
      if (typeof p.targetRequestId !== "string" || !p.targetRequestId.trim()) {
        return { valid: false, error: "operation.cancel requires non-empty targetRequestId." };
      }
      return { valid: true };
    }
    case "session.close":
      return { valid: true };
    default:
      return { valid: false, error: `Unhandled operation type: "${String(type)}".` };
  }
}

/**
 * Validate that an incoming object matches the DirectRequestEnvelope schema and operation payload.
 */
export function validateRequestEnvelope(input: unknown): { valid: boolean; envelope?: DirectRequestEnvelope; error?: string } {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Message must be a non-null JSON object." };
  }

  const record = input as Partial<DirectRequestEnvelope>;
  if (record.protocol !== DIRECT_PROTOCOL_VERSION) {
    return { valid: false, error: `Invalid protocol: "${String(record.protocol)}". Expected "${DIRECT_PROTOCOL_VERSION}".` };
  }

  if (typeof record.sessionId !== "string" || !record.sessionId.trim()) {
    return { valid: false, error: "sessionId is required and must be a non-empty string." };
  }

  if (typeof record.requestId !== "string" || !record.requestId.trim()) {
    return { valid: false, error: "requestId is required and must be a non-empty string." };
  }

  if (!/^[A-Za-z0-9._-]{6,128}$/.test(record.requestId)) {
    return { valid: false, error: "requestId must be an alphanumeric string between 6 and 128 characters." };
  }

  if (typeof record.sequence !== "number" || !Number.isInteger(record.sequence) || record.sequence < 0) {
    return { valid: false, error: "sequence must be a non-negative integer." };
  }

  if (typeof record.timestamp !== "string" || !record.timestamp.trim()) {
    return { valid: false, error: "timestamp is required." };
  }

  const timestampMs = Date.parse(record.timestamp);
  if (Number.isNaN(timestampMs)) {
    return { valid: false, error: "timestamp must be a valid ISO 8601 string." };
  }

  if (typeof record.nonce !== "string" || !record.nonce.trim() || record.nonce.length < 8) {
    return { valid: false, error: "nonce must be a string of at least 8 characters." };
  }

  if (typeof record.type !== "string" || !(DIRECT_OPERATION_TYPES as readonly string[]).includes(record.type)) {
    return { valid: false, error: `Unsupported operation type: "${String(record.type)}".` };
  }

  if (record.payload === undefined) {
    return { valid: false, error: "payload is required." };
  }

  const payloadValidation = validateOperationPayload(record.type, record.payload);
  if (!payloadValidation.valid) {
    return { valid: false, error: payloadValidation.error };
  }

  return {
    valid: true,
    envelope: record as DirectRequestEnvelope,
  };
}
