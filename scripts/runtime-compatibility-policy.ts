import { platform } from "node:os";

/**
 * Canonical runtime baseline policy.
 *
 * `config/runtime-compatibility-reference.json` is the machine-checked project
 * release and reproducibility baseline. It is not a prohibition against agents
 * working in task-appropriate compatible environments.
 *
 * A different host must not rewrite dependencies, lockfiles, generated source,
 * or the canonical reference merely to accommodate that host. Final source,
 * manifests, lockfiles, generated artifacts, and behavior must be reproducible
 * on and compatible with the canonical baseline.
 */
export const CANONICAL_NODE_RANGE = ">=22 <25";
export const CANONICAL_NPM_RANGE = ">=11 <12";
export const CANONICAL_PACKAGE_MANAGER = "npm@11.19.0";
export const CANONICAL_TYPESCRIPT_MAJOR = 5;
export const CANONICAL_ESLINT_MAJOR = 9;
export const IOS_COMPILE_SIGN_EVIDENCE_GAP = "ios-compile-sign";

export type HostClass =
  | "canonical-baseline-host"
  | "compatible-host"
  | "unsupported-host";

export interface HostClassification {
  hostClass: HostClass;
  platform: NodeJS.Platform;
  nodeVersion: string;
  nodeCompatible: boolean;
  unavailableVerifications: string[];
}

export function nodeMajor(version: string): number {
  return Number(version.replace(/^v/, "").split(".")[0]);
}

export function isCompatibleNodeVersion(version: string): boolean {
  const major = nodeMajor(version);
  return major >= 22 && major < 25;
}

export function classifyHost(
  nodeVersion = process.version,
  hostPlatform: NodeJS.Platform = platform(),
  referenceMatches = true,
): HostClassification {
  const nodeCompatible = isCompatibleNodeVersion(nodeVersion);
  const unavailableVerifications =
    hostPlatform === "darwin" ? [] : [IOS_COMPILE_SIGN_EVIDENCE_GAP];
  if (!nodeCompatible) {
    return {
      hostClass: "unsupported-host",
      platform: hostPlatform,
      nodeVersion,
      nodeCompatible,
      unavailableVerifications,
    };
  }
  return {
    hostClass: referenceMatches ? "canonical-baseline-host" : "compatible-host",
    platform: hostPlatform,
    nodeVersion,
    nodeCompatible,
    unavailableVerifications,
  };
}

export function evidenceGapMessage(gap: string): string {
  if (gap === IOS_COMPILE_SIGN_EVIDENCE_GAP) {
    return "Evidence gap ios-compile-sign: Xcode compile/archive/sign validation requires macOS and was not executed on this host.";
  }
  return `Evidence gap ${gap}: platform-specific verification is unavailable on this host.`;
}
