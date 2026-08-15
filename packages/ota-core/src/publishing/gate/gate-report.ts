import type { GateDecision } from "./native-gate";

export function formatNativeSurfaceReport(decision: GateDecision): string {
  if (decision.state === "unprovable") {
    return `Native baseline: (none)\nStatus: UNPROVABLE (${decision.reason})`;
  }

  if (decision.state === "open") {
    return [
      `Native baseline: ${decision.baseline}`,
      `Native shell version: ${decision.nativeVersion}`,
      "Native surfaces changed: 0",
      "Status: OPEN (OTA release permitted)",
    ].join("\n");
  }

  const lines = [
    `Native baseline: ${decision.baseline}`,
    `Native shell version: ${decision.nativeVersion}`,
    "Compared: working tree (committed, uncommitted, and untracked)",
    `Native surfaces changed: ${decision.changedPaths.length}`,
    ...decision.changedPaths.slice(0, 20).map((file) => `  - ${file}`),
  ];
  if (decision.changedPaths.length > 20) {
    lines.push(`  … and ${decision.changedPaths.length - 20} more`);
  }
  if (decision.changedNativeDependencies.length > 0) {
    lines.push(
      `Native dependencies changed: ${decision.changedNativeDependencies.join(", ")}`,
    );
  }
  lines.push(`Status: BLOCKED`);
  lines.push(`Reason: ${decision.reason}`);
  return lines.join("\n");
}
