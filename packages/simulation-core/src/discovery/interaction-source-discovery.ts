import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import type {
  DiscoveredPageInteractions,
  DiscoveredUserPage,
} from "./discovery.types";

const IMPORT_PATTERN = /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
const INTERACTION_PATTERN = /\b(onClick|onSubmit|onChange|onPointerDown|onKeyDown|href|type\s*=\s*["']submit["'])\b/;
/**
 * Simulation instrumentation is invisible to interaction discovery: markers are
 * addressing metadata, never a behavioural change of the page itself.
 */
const SIMULATION_INSTRUMENTATION_PATTERN =
  /\s(?:data-simulation-(?:target|field|list-item|file)|simulation(?:TargetId|ListItemId|FileId|Index))=(?:"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})/g;

function resolveSourceFile(root: string, importer: string, specifier: string): string | null {
  let candidate: string;
  if (specifier.startsWith("@/")) candidate = path.join(root, "src", specifier.slice(2));
  else if (specifier.startsWith(".")) candidate = path.resolve(path.dirname(importer), specifier);
  else return null;

  for (const suffix of ["", ".ts", ".tsx", "/index.ts", "/index.tsx", "/ui.ts", "/server.ts"]) {
    const resolved = `${candidate}${suffix}`;
    if (existsSync(resolved) && statSync(resolved).isFile()) return resolved;
  }
  return null;
}

function reachableSourceFiles(root: string, sourceFile: string): string[] {
  const pending = [path.join(root, sourceFile)];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (visited.has(current) || !existsSync(current)) continue;
    visited.add(current);
    const source = readFileSync(current, "utf8");
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const resolved = resolveSourceFile(root, current, match[1]!);
      if (resolved && resolved.startsWith(path.join(root, "src"))) pending.push(resolved);
    }
  }
  return [...visited].sort();
}

export function discoverPageInteractionSources(
  page: DiscoveredUserPage,
  root = process.cwd(),
): DiscoveredPageInteractions {
  const sourceFiles = reachableSourceFiles(root, page.sourceFile);
  const signatures: string[] = [];
  for (const absolute of sourceFiles) {
    const relative = path.relative(root, absolute).replace(/\\/g, "/");
    const lines = readFileSync(absolute, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!
        .replace(SIMULATION_INSTRUMENTATION_PATTERN, "")
        .trim()
        .replace(/\s+/g, " ");
      if (INTERACTION_PATTERN.test(line)) signatures.push(`${relative}:${line}`);
    }
  }
  return {
    route: page.route,
    sourceDigest: createHash("sha256").update(signatures.join("\n")).digest("hex"),
    interactionSourceCount: signatures.length,
    sourceFiles: sourceFiles.map((file) => path.relative(root, file).replace(/\\/g, "/")),
  };
}
