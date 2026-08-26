import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { SimulationTargetKind } from "../domain/simulation.types";

export interface DiscoveredSimulationTarget {
  readonly kind: SimulationTargetKind;
  readonly id: string;
  readonly sourceFile: string;
}

const INSTRUMENTATION_PATTERNS: Readonly<Record<SimulationTargetKind, RegExp>> = {
  event:
    /(?:data-simulation-target|simulationTargetId)\s*(?:=|:)\s*(?:\{[^}]*?)?["']([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)["']/g,
  field:
    /(?:data-simulation-field|simulationFieldId)\s*(?:=|:)\s*(?:\{[^}]*?)?["']([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)["']/g,
  "list-item":
    /(?:data-simulation-list-item|simulationListItemId|simulationToggleListItemId)\s*(?:=|:)\s*(?:\{[^}]*?)?["']([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)["']/g,
  file:
    /(?:data-simulation-file|simulationFileId)\s*(?:=|:)\s*(?:\{[^}]*?)?["']([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)["']/g,
  state:
    /data-simulation-state\s*=\s*(?:\{[^}]*?)?["']([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)["']/g,
};
const UI_REGISTRY_MARKER_PATTERN =
  /simulation\s*:\s*\{\s*kind\s*:\s*["'](event|field|list-item|file|state)["']\s*,\s*id\s*:\s*["']([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)["']\s*\}/g;
const INSTRUMENTATION_KEY_PATTERN =
  /(?:data-simulation-target|data-simulation-field|data-simulation-list-item|data-simulation-file|data-simulation-state|simulationTargetId|simulationFieldId|simulationListItemId|simulationToggleListItemId|simulationFileId)\s*(?:=|:)/g;
const UI_TOKEN_LITERAL_PATTERN = /["']([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)["']/g;

function kindForInstrumentationKey(key: string): SimulationTargetKind {
  if (key.includes("list-item") || key.includes("ListItem")) return "list-item";
  if (key.includes("file") || key.includes("File")) return "file";
  if (key.includes("field") || key.includes("Field")) return "field";
  if (key.includes("state")) return "state";
  return "event";
}

function applicationSourceFiles(root: string): readonly string[] {
  const roots = [path.join(root, "src"), path.join(root, "packages")];
  const files: string[] = [];
  const visit = (directory: string): void => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        if (
          entry.name === "node_modules" ||
          entry.name === "dist" ||
          entry.name === "tests" ||
          relative.startsWith("packages/simulation-core/")
        ) continue;
        visit(absolute);
      } else if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) {
        files.push(absolute);
      }
    }
  };
  roots.forEach(visit);
  return files.sort((left, right) => left.localeCompare(right));
}

/**
 * Finds the real UI instrumentation consumed by simulation. It recognizes
 * legacy markers and UiRegistry descriptors, so deleting or renaming an
 * addressed element cannot leave a stale action in the simulation registry.
 */
export function discoverSimulationInstrumentation(
  root = process.cwd(),
): readonly DiscoveredSimulationTarget[] {
  const discovered: DiscoveredSimulationTarget[] = [];
  for (const absolute of applicationSourceFiles(root)) {
    const source = readFileSync(absolute, "utf8");
    const sourceFile = path.relative(root, absolute).replace(/\\/g, "/");
    for (const [kind, pattern] of Object.entries(INSTRUMENTATION_PATTERNS) as [
      SimulationTargetKind,
      RegExp,
    ][]) {
      for (const match of source.matchAll(pattern)) {
        discovered.push({ kind, id: match[1]!, sourceFile });
      }
    }
    for (const match of source.matchAll(INSTRUMENTATION_KEY_PATTERN)) {
      const kind = kindForInstrumentationKey(match[0]!);
      const expression = source.slice(match.index, match.index + 240);
      for (const literal of expression.matchAll(UI_TOKEN_LITERAL_PATTERN)) {
        discovered.push({ kind, id: literal[1]!, sourceFile });
      }
    }
    for (const match of source.matchAll(UI_REGISTRY_MARKER_PATTERN)) {
      discovered.push({
        kind: match[1]! as SimulationTargetKind,
        id: match[2]!,
        sourceFile,
      });
    }
  }
  return discovered;
}
