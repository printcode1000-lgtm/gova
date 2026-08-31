import { DirectAgentError } from "./errors";

/**
 * Capability grants for direct agent sessions.
 *
 * A session only receives explicitly granted capabilities.
 * Capabilities are checked on every inbound operation.
 */

export const DIRECT_CAPABILITIES = [
  "inspect",
  "execute",
  "mutate-worktree",
  "mutate-main",
  "coordinate",
  "host-admin",
] as const;

export type DirectCapability = (typeof DIRECT_CAPABILITIES)[number];

export const DEFAULT_ALLOWED_CAPABILITIES: readonly DirectCapability[] = [
  "inspect",
  "execute",
  "mutate-worktree",
  "mutate-main",
  "coordinate",
] as const;

export function isDirectCapability(value: unknown): value is DirectCapability {
  return typeof value === "string" && (DIRECT_CAPABILITIES as readonly string[]).includes(value);
}

export function isCapabilityGranted(granted: readonly DirectCapability[], required: DirectCapability): boolean {
  if (granted.includes("host-admin")) return true;
  return granted.includes(required);
}

export function assertCapability(granted: readonly DirectCapability[], required: DirectCapability): void {
  if (!isCapabilityGranted(granted, required)) {
    throw new DirectAgentError(
      "capability-denied",
      `Session lacks required capability "${required}". Granted capabilities: [${granted.join(", ")}]`,
      { required, granted: [...granted] },
    );
  }
}

export function assertCapabilities(granted: readonly DirectCapability[], required: readonly DirectCapability[]): void {
  for (const cap of required) {
    assertCapability(granted, cap);
  }
}

export function validateCapabilitySubset(
  requested: readonly unknown[],
  allowed: readonly DirectCapability[] = DEFAULT_ALLOWED_CAPABILITIES,
): { valid: boolean; capabilities: DirectCapability[]; errors: string[] } {
  const errors: string[] = [];
  const validCaps: DirectCapability[] = [];

  if (!Array.isArray(requested) || requested.length === 0) {
    return { valid: false, capabilities: [], errors: ["requestedCapabilities must be a non-empty array."] };
  }

  for (const item of requested) {
    if (!isDirectCapability(item)) {
      errors.push(`Unknown capability: "${String(item)}"`);
      continue;
    }
    if (!allowed.includes(item)) {
      errors.push(`Capability "${item}" is not allowed by server policy.`);
      continue;
    }
    if (!validCaps.includes(item)) {
      validCaps.push(item);
    }
  }

  return {
    valid: errors.length === 0,
    capabilities: validCaps,
    errors,
  };
}

export function operationRequiredCapabilities(type: string, payload?: unknown): DirectCapability[] {
  switch (type) {
    case "status":
    case "inspect.list":
    case "inspect.read":
    case "inspect.search":
    case "git.status":
      return ["inspect"];
    case "exec":
      return ["execute"];
    case "patch.apply": {
      const isMain = payload && typeof payload === "object" && (payload as { targetMode?: string }).targetMode === "main";
      return isMain ? ["mutate-main"] : ["mutate-worktree"];
    }
    case "coordination.declare":
    case "coordination.heartbeat":
    case "coordination.lock":
    case "coordination.unlock":
    case "coordination.status":
      return ["coordinate"];
    case "operation.cancel":
    case "session.close":
      return []; // Session holder can always cancel own op or close own session
    default:
      return ["host-admin"];
  }
}
