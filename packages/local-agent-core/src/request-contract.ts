import { looksLikeSecretValue, patchSecretViolations } from "./secret-paths";

/**
 * The dispatch request contract.
 *
 * A cloud agent that cannot call the `workflow_dispatch` API writes one of these
 * documents into the repository instead; the gateway validates it and performs
 * the real dispatch. Validation is the only trust boundary between "an agent
 * pushed a file" and "a job runs on this machine", so it is deliberately strict:
 * a closed workflow allowlist, a closed input allowlist per workflow, a freshness
 * window that defeats replays, and a secret scan over every value.
 */

export const DISPATCH_REQUEST_VERSION = 1;

export const DISPATCHABLE_WORKFLOWS = {
  "local-agent-status": {
    file: "local-agent-status.yml",
    mode: "status",
    required: [] as const,
    optional: ["paths"] as const,
  },
  "local-agent-inspect": {
    file: "local-agent-inspect.yml",
    mode: "inspect",
    required: ["agent_id"] as const,
    optional: ["mode", "paths", "pattern"] as const,
  },
  "local-agent-workspace": {
    file: "local-agent-workspace.yml",
    mode: "workspace",
    required: ["agent_id", "commit_message"] as const,
    optional: ["patch_base64", "shell_command", "verification", "scopes"] as const,
  },
  "local-agent-main": {
    file: "local-agent-main.yml",
    mode: "main",
    required: ["agent_id", "commit_message"] as const,
    optional: ["patch_base64", "shell_command", "verification", "scopes"] as const,
  },
  "local-agent-coordination": {
    file: "local-agent-coordination.yml",
    mode: "coordination",
    required: ["agent_id", "action"] as const,
    optional: ["scope", "scope_kind", "task", "branch", "message_kind", "message_body", "message_to", "status"] as const,
  },
} as const;

export type DispatchableWorkflow = keyof typeof DISPATCHABLE_WORKFLOWS;

export const ALLOWED_DISPATCH_REFS = ["main"] as const;

/** Mirrors the verification allowlist in `scripts/local-agent-main-apply.ts`. */
export const ALLOWED_VERIFICATIONS = [
  "github-ci-policy",
  "runtime-check",
  "docs-ci",
  "architecture-check",
  "typecheck",
  "lint",
  "none",
] as const;

export const DEFAULT_VERIFICATION = "github-ci-policy";

/** Requests older than this are refused, so a replayed document cannot re-run. */
export const MAX_REQUEST_AGE_MS = 30 * 60 * 1000;
/** Small tolerance for clock skew between a cloud agent and this machine. */
export const MAX_REQUEST_FUTURE_MS = 5 * 60 * 1000;

export const MAX_INPUT_VALUE_LENGTH = 200_000;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/;
const AGENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,47}$/;

export interface DispatchRequest {
  version: number;
  requestId: string;
  agentId: string;
  workflow: DispatchableWorkflow;
  mode: string;
  ref: string;
  inputs: Record<string, string>;
  createdAt: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  request: DispatchRequest | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isDispatchableWorkflow(value: string): value is DispatchableWorkflow {
  return Object.prototype.hasOwnProperty.call(DISPATCHABLE_WORKFLOWS, value);
}

function validateInputs(workflow: DispatchableWorkflow, inputs: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const contract = DISPATCHABLE_WORKFLOWS[workflow];
  const allowed = new Set<string>([...contract.required, ...contract.optional]);

  for (const key of contract.required) {
    const value = inputs[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`inputs.${key} is required for ${workflow}.`);
    }
  }
  for (const [key, value] of Object.entries(inputs)) {
    if (!allowed.has(key)) {
      errors.push(`inputs.${key} is not accepted by ${workflow}.`);
      continue;
    }
    if (typeof value !== "string") {
      errors.push(`inputs.${key} must be a string.`);
      continue;
    }
    if (value.length > MAX_INPUT_VALUE_LENGTH) {
      errors.push(`inputs.${key} exceeds ${MAX_INPUT_VALUE_LENGTH} characters.`);
      continue;
    }
    if (key === "patch_base64") {
      errors.push(...patchInputViolations(value));
      continue;
    }
    if (looksLikeSecretValue(value)) errors.push(`inputs.${key} looks like it carries a secret.`);
  }

  if (workflow === "local-agent-workspace" || workflow === "local-agent-main") {
    const hasPatch = typeof inputs.patch_base64 === "string" && inputs.patch_base64.trim().length > 0;
    const hasShell = typeof inputs.shell_command === "string" && inputs.shell_command.trim().length > 0;
    // The workflow's own default applies when the request omits the input.
    const verification =
      typeof inputs.verification === "string" && inputs.verification.trim()
        ? inputs.verification.trim()
        : DEFAULT_VERIFICATION;
    if (!(ALLOWED_VERIFICATIONS as readonly string[]).includes(verification)) {
      errors.push(`inputs.verification must be one of: ${ALLOWED_VERIFICATIONS.join(", ")}.`);
    }
    // A job with no patch and no shell is a verification-only run, which is a
    // real and useful shape: prove the tree still passes a check. It is only
    // meaningless when there is nothing to verify either.
    if (!hasPatch && !hasShell && verification === "none") {
      errors.push(
        `${workflow} would do nothing: supply inputs.patch_base64, inputs.shell_command, or a verification other than "none".`,
      );
    }
  }
  return errors;
}

function patchInputViolations(patchBase64: string): string[] {
  if (!patchBase64.trim()) return [];
  let decoded: string;
  try {
    decoded = Buffer.from(patchBase64, "base64").toString("utf8");
  } catch {
    return ["inputs.patch_base64 is not valid base64."];
  }
  if (!decoded.includes("diff --git ")) return ["inputs.patch_base64 must decode to a git diff."];
  const violations = patchSecretViolations(decoded);
  return violations.map((candidate) => `inputs.patch_base64 touches a secret-bearing path: ${candidate}`);
}

export interface ValidateOptions {
  now?: number;
  knownRequestIds?: ReadonlySet<string>;
  maxAgeMs?: number;
}

export function validateDispatchRequest(candidate: unknown, options: ValidateOptions = {}): ValidationResult {
  const now = options.now ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? MAX_REQUEST_AGE_MS;
  const errors: string[] = [];
  const document = asRecord(candidate);
  if (!document) return { valid: false, errors: ["Request must be a JSON object."], request: null };

  const version = document.version;
  if (version !== undefined && version !== DISPATCH_REQUEST_VERSION) {
    errors.push(`Unsupported request version: ${String(version)}.`);
  }

  const requestId = typeof document.requestId === "string" ? document.requestId.trim() : "";
  if (!REQUEST_ID_PATTERN.test(requestId)) {
    errors.push("requestId must be 8-64 characters of [A-Za-z0-9._-] starting alphanumeric.");
  } else if (looksLikeSecretValue(requestId)) {
    errors.push("requestId looks like it carries a secret.");
  } else if (options.knownRequestIds?.has(requestId)) {
    errors.push(`requestId ${requestId} was already processed; duplicate execution refused.`);
  }

  const agentId = typeof document.agentId === "string" ? document.agentId.trim() : "";
  if (!AGENT_ID_PATTERN.test(agentId)) {
    errors.push("agentId must be 3-48 characters of [A-Za-z0-9._-] starting alphanumeric.");
  }

  const workflowName = typeof document.workflow === "string" ? document.workflow.trim() : "";
  if (!isDispatchableWorkflow(workflowName)) {
    errors.push(`workflow must be one of: ${Object.keys(DISPATCHABLE_WORKFLOWS).join(", ")}.`);
  }

  const ref = typeof document.ref === "string" && document.ref.trim() ? document.ref.trim() : "main";
  if (!(ALLOWED_DISPATCH_REFS as readonly string[]).includes(ref)) {
    errors.push(`ref must be one of: ${ALLOWED_DISPATCH_REFS.join(", ")}.`);
  }

  const createdAtRaw = typeof document.createdAt === "string" ? document.createdAt : "";
  const createdAtMs = Date.parse(createdAtRaw);
  if (!Number.isFinite(createdAtMs)) {
    errors.push("createdAt must be an ISO-8601 timestamp.");
  } else if (now - createdAtMs > maxAgeMs) {
    errors.push(`createdAt is older than ${Math.round(maxAgeMs / 60000)} minutes; stale request refused.`);
  } else if (createdAtMs - now > MAX_REQUEST_FUTURE_MS) {
    errors.push("createdAt is in the future; refusing to dispatch.");
  }

  const inputs = asRecord(document.inputs) ?? {};
  if (document.inputs !== undefined && !asRecord(document.inputs)) errors.push("inputs must be an object.");

  let mode = "";
  if (isDispatchableWorkflow(workflowName)) {
    const contract = DISPATCHABLE_WORKFLOWS[workflowName];
    mode = contract.mode;
    const declaredMode = typeof document.mode === "string" ? document.mode.trim() : "";
    if (declaredMode && declaredMode !== contract.mode) {
      errors.push(`mode must be "${contract.mode}" for ${workflowName}.`);
    }
    errors.push(...validateInputs(workflowName, inputs));
  }

  if (errors.length > 0) return { valid: false, errors, request: null };

  return {
    valid: true,
    errors: [],
    request: {
      version: DISPATCH_REQUEST_VERSION,
      requestId,
      agentId,
      workflow: workflowName as DispatchableWorkflow,
      mode,
      ref,
      inputs: Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, String(value)])),
      createdAt: new Date(createdAtMs).toISOString(),
    },
  };
}
