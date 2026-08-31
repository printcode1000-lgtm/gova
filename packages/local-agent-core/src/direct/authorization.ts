import { looksLikeSecretValue } from "../secret-paths";
import { DEFAULT_ALLOWED_CAPABILITIES, DirectCapability, validateCapabilitySubset } from "./capabilities";
import { generateEphemeralKeyPair, generateSessionId } from "./crypto";
import { DirectAgentError } from "./errors";
import { DIRECT_LIMITS } from "./protocol";
import { ReplayCache } from "./replay-cache";
import { DirectSession, SessionStore } from "./session";

export const DIRECT_AUTH_BRANCH = "agent-request/chatgpt";
export const DIRECT_AUTH_DIRECTORY = ".agent-control/direct-auth";

export interface DirectAuthRequest {
  schemaVersion: 1;
  requestId: string;
  agentId: string;
  hostId: string;
  challenge: string;
  clientEphemeralPublicKey: string;
  requestedCapabilities: DirectCapability[];
  createdAt: string;
  expiresAt: string;
}

export interface DirectAuthValidationContext {
  currentChallenge: string;
  hostId: string;
  replayCache: ReplayCache;
  sessionStore: SessionStore;
  allowedCapabilities?: readonly DirectCapability[];
  allowedAgentIds?: readonly string[];
  now?: number;
}

export interface DirectAuthValidationResult {
  valid: boolean;
  errors: string[];
  session?: DirectSession;
}

/**
 * Validate an inbound GitHub direct-auth bootstrap request.
 * Enforces all security criteria before any direct session is accepted.
 */
export function validateAndGrantBootstrapSession(
  input: unknown,
  context: DirectAuthValidationContext,
): DirectAuthValidationResult {
  const errors: string[] = [];
  const now = context.now ?? Date.now();

  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Bootstrap request must be a JSON object."] };
  }

  const req = input as Partial<DirectAuthRequest>;

  // 1. Schema version
  if (req.schemaVersion !== 1) {
    errors.push(`Invalid schemaVersion: "${String(req.schemaVersion)}". Expected 1.`);
  }

  // 2. Request ID validity & single-use
  if (typeof req.requestId !== "string" || !/^[A-Za-z0-9._-]{8,128}$/.test(req.requestId)) {
    errors.push("requestId must be an alphanumeric string between 8 and 128 characters.");
  } else if (context.replayCache.hasConsumed(req.requestId)) {
    errors.push(`requestId "${req.requestId}" has already been consumed (replay detected).`);
  }

  // 3. Agent ID check
  const allowedAgents = context.allowedAgentIds ?? ["chatgpt", "local-agent", "gova-agent"];
  if (typeof req.agentId !== "string" || !allowedAgents.includes(req.agentId)) {
    errors.push(`agentId "${String(req.agentId)}" is not authorized. Allowed agents: [${allowedAgents.join(", ")}].`);
  }

  // 4. Host ID check
  if (typeof req.hostId !== "string" || req.hostId.trim().toLowerCase() !== context.hostId.trim().toLowerCase()) {
    errors.push(`hostId "${String(req.hostId)}" does not match target host "${context.hostId}".`);
  }

  // 5. Challenge match & single-use
  if (typeof req.challenge !== "string" || !req.challenge.trim()) {
    errors.push("challenge is required.");
  } else if (req.challenge !== context.currentChallenge) {
    errors.push("challenge does not match the active discovery challenge.");
  } else if (context.replayCache.hasConsumed(req.challenge)) {
    errors.push(`challenge "${req.challenge}" has already been consumed.`);
  }

  // 6. Client ephemeral public key
  if (typeof req.clientEphemeralPublicKey !== "string" || !req.clientEphemeralPublicKey.includes("PUBLIC KEY")) {
    errors.push("clientEphemeralPublicKey must be a valid PEM formatted public key.");
  }

  // 7. Freshness check: createdAt <= 5 minutes
  if (typeof req.createdAt !== "string" || !req.createdAt.trim()) {
    errors.push("createdAt timestamp is required.");
  } else {
    const createdMs = Date.parse(req.createdAt);
    if (Number.isNaN(createdMs)) {
      errors.push("createdAt must be a valid ISO 8601 timestamp.");
    } else if (Math.abs(now - createdMs) > DIRECT_LIMITS.bootstrapValidityMs) {
      errors.push(`createdAt is outside the ${DIRECT_LIMITS.bootstrapValidityMs / 1000}s freshness window.`);
    }
  }

  // 8. Expiry check: expiresAt > now
  if (typeof req.expiresAt !== "string" || !req.expiresAt.trim()) {
    errors.push("expiresAt timestamp is required.");
  } else {
    const expiresMs = Date.parse(req.expiresAt);
    if (Number.isNaN(expiresMs)) {
      errors.push("expiresAt must be a valid ISO 8601 timestamp.");
    } else if (expiresMs <= now) {
      errors.push("Bootstrap request has already expired.");
    }
  }

  // 9. Capability subset check
  const capCheck = validateCapabilitySubset(
    req.requestedCapabilities ?? [],
    context.allowedCapabilities ?? DEFAULT_ALLOWED_CAPABILITIES,
  );
  if (!capCheck.valid) {
    errors.push(...capCheck.errors);
  }

  // 10. Secret exfiltration check
  for (const [key, value] of Object.entries(req)) {
    if (typeof value === "string" && key !== "clientEphemeralPublicKey" && looksLikeSecretValue(value)) {
      errors.push(`Field "${key}" appears to contain secret-bearing material and is rejected.`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Authorization passed! Consume challenge & request ID to prevent replay
  const validReq = req as DirectAuthRequest;
  context.replayCache.consume(validReq.requestId, "request", { agentId: validReq.agentId });
  context.replayCache.consume(validReq.challenge, "challenge", { requestId: validReq.requestId });

  // Generate server ephemeral key pair for session
  const serverEphemeral = generateEphemeralKeyPair();
  const sessionId = generateSessionId();

  // Create session grant
  const session = context.sessionStore.createSession(
    {
      sessionId,
      agentId: validReq.agentId,
      bootstrapRequestId: validReq.requestId,
      consumedChallenge: validReq.challenge,
      capabilities: capCheck.capabilities,
      clientEphemeralPublicKey: validReq.clientEphemeralPublicKey,
      serverEphemeralPublicKey: serverEphemeral.publicKeyPem,
    },
    now,
  );

  return {
    valid: true,
    errors: [],
    session,
  };
}

/**
 * Helper to construct a client bootstrap authorization request.
 */
export function createBootstrapAuthRequest(input: {
  agentId?: string;
  hostId: string;
  challenge: string;
  clientEphemeralPublicKey: string;
  requestedCapabilities?: DirectCapability[];
  now?: number;
}): DirectAuthRequest {
  const now = input.now ?? Date.now();
  const requestId = `auth_${now}_${Math.random().toString(36).slice(2, 10)}`;
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + DIRECT_LIMITS.bootstrapValidityMs).toISOString();

  return {
    schemaVersion: 1,
    requestId,
    agentId: input.agentId ?? "chatgpt",
    hostId: input.hostId,
    challenge: input.challenge,
    clientEphemeralPublicKey: input.clientEphemeralPublicKey,
    requestedCapabilities: input.requestedCapabilities ?? [...DEFAULT_ALLOWED_CAPABILITIES],
    createdAt,
    expiresAt,
  };
}
