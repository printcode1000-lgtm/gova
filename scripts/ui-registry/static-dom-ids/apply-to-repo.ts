import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import { literalHtmlIds } from "./literal-html-ids";
import { applyStaticDomIdEdits, planStaticDomIds } from "./plan-static-dom-ids";

function tsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      return entry === "node_modules" ? [] : tsxFiles(full);
    }
    if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) return [];
    if (entry.endsWith(".tsx") || entry.endsWith(".ts")) return [full];
    return [];
  });
}

export function loadSrcTsx(root: string): Map<string, string> {
  const sources = new Map<string, string>();
  for (const full of tsxFiles(join(root, "src"))) {
    const relativePath = relative(root, full).replace(/\\/g, "/");
    sources.set(relativePath, readFileSync(full, "utf8"));
  }
  return sources;
}

export function duplicateLiteralIds(sources: Map<string, string>): string[] {
  const seen = new Map<string, number>();
  for (const source of sources.values()) {
    for (const id of literalHtmlIds(source)) {
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

export function writeSources(root: string, sources: Map<string, string>): void {
  for (const [relativePath, source] of sources) {
    writeFileSync(join(root, relativePath), source, "utf8");
  }
}

/**
 * Adds literal semantic HTML ids to static visible hosts and static component
 * usages that cannot repeat in one DOM, then refuses if any literal id is duplicated.
 */
export function applyStaticDomIdsToRepo(root: string): {
  editedFiles: number;
  assigned: number;
} {
  const original = loadSrcTsx(root);
  const edits = planStaticDomIds(original);
  const updated = applyStaticDomIdEdits(original, edits);
  const duplicates = duplicateLiteralIds(updated);
  if (duplicates.length > 0) {
    throw new Error(`duplicate HTML ids: ${duplicates.slice(0, 20).join(", ")}`);
  }
  const changed = [...updated.entries()].filter(([file, source]) => original.get(file) !== source);
  for (const [file, source] of changed) {
    writeFileSync(join(root, file), source, "utf8");
  }
  return { editedFiles: changed.length, assigned: edits.length };
}
