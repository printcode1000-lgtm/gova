const DROPPED_SEGMENTS = new Set([
  "src",
  "features",
  "presentation",
  "components",
  "hooks",
  "application",
  "ui",
  "app",
]);

function camelToKebab(value: string): string {
  return value
    .replace(/\.tsx$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Stable semantic prefix for HTML ids, derived from the source path only —
 * never from labels, routes, or runtime values.
 */
export function fileSemanticPrefix(relativePath: string): string {
  const parts = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);
  const kept = parts
    .map(camelToKebab)
    .filter((part) => part.length > 0 && !DROPPED_SEGMENTS.has(part));
  const joined = kept.join(".");
  return joined.length > 0 ? joined : "app";
}
