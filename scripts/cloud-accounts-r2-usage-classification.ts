export type R2BillingClass = "A" | "B" | "free";

const FREE_ACTIONS = new Set([
  "abortmultipartupload",
  "deleteobject",
  "deleteobjects",
]);

export function classifyR2Operation(actionType: string): R2BillingClass {
  const normalized = actionType.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (FREE_ACTIONS.has(normalized)) return "free";

  // Cloudflare R2 bills GET/HEAD-style reads as Class B. LIST operations are
  // Class A, so a generic "read/list" heuristic produces inverted usage.
  if (normalized.startsWith("get") || normalized.startsWith("head")) return "B";

  return "A";
}
