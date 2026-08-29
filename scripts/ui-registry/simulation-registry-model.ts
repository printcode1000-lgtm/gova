import { statSync } from "node:fs";
import { join } from "node:path";

import {
  findDescriptorLiterals,
  hostMultiplicity,
  isInsideIteratorCallback,
  loadProjectTsx,
  reachableProjectFiles,
  readUiPageRegistryAst,
} from "@asol/architecture-core";
import ts from "typescript";

/**
 * Generated simulation target derived exclusively from canonical source AST.
 * No textual descriptor/import/repetition parser is allowed in this pipeline.
 */
export interface GeneratedSimulationTarget {
  uid: string;
  id: string;
  kind: string;
  interactionType: string | null;
  valueContract: string | null;
  simulationId: string | null;
  simulationKind: string | null;
  routes: string[];
  repeated: boolean;
  sourceFile: string;
  sourceLine: number;
}

const PAGE_REGISTRY_FILE = "packages/ui-registry-core/src/registry/ui-page-registry.ts";

function parseSource(file: string, source: string): ts.SourceFile {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/**
 * Every file that renders a route: its page and every layout above it.
 * Paths are repository-relative because `reachableProjectFiles` consumes the
 * same canonical source graph returned by `loadProjectTsx`.
 */
function routeEntries(
  root: string,
  route: string,
  sources: ReadonlyMap<string, string>,
): string[] {
  const segments = route === "/" ? [] : route.slice(1).split("/");
  const entries = ["src/app/layout.tsx"];
  let directory = "src/app";
  for (const segment of segments) {
    directory = `${directory}/${segment}`;
    entries.push(`${directory}/layout.tsx`);
  }
  entries.push(`${directory}/page.tsx`);

  // Source graph membership is authoritative; the stat check is retained only
  // as a defensive parity check for callers using an unusual root.
  return entries.filter(
    (entry) =>
      sources.has(entry) &&
      statSync(join(root, entry), { throwIfNoEntry: false })?.isFile() === true,
  );
}

function literalField(
  literal: ReturnType<typeof findDescriptorLiterals>[number],
  name: string,
): string | null {
  return literal.fields.get(name)?.literalValue ?? null;
}

/**
 * Builds the generated catalog from the canonical descriptor/reachability AST
 * model. A simulation-capable descriptor that cannot be represented
 * statically is an error, never a silently omitted target.
 */
export function buildSimulationRegistry(root: string): GeneratedSimulationTarget[] {
  const sources = loadProjectTsx(root);
  const pageRegistrySource = sources.get(PAGE_REGISTRY_FILE);
  if (!pageRegistrySource) {
    throw new Error(`Missing canonical UI page registry source: ${PAGE_REGISTRY_FILE}`);
  }
  const pages = readUiPageRegistryAst(PAGE_REGISTRY_FILE, pageRegistrySource);
  if (pages.length === 0) {
    throw new Error("UI_PAGE_REGISTRY could not be parsed by the canonical AST reader");
  }

  const routesByFile = new Map<string, Set<string>>();
  for (const page of pages) {
    const reachable = reachableProjectFiles(routeEntries(root, page.route, sources), sources);
    for (const file of reachable) {
      const routes = routesByFile.get(file) ?? new Set<string>();
      routes.add(page.route);
      routesByFile.set(file, routes);
    }
  }

  const multiplicity = hostMultiplicity(sources);
  const targets: GeneratedSimulationTarget[] = [];

  for (const [file, source] of sources) {
    if (file.startsWith("packages/ui-registry-core/")) continue;
    const sourceFile = parseSource(file, source);
    for (const literal of findDescriptorLiterals(file, source, sourceFile)) {
      const hasSimulationMetadata =
        literal.interaction !== null ||
        literal.simulation !== null ||
        literal.interactionComputed ||
        literal.simulationComputed;
      if (!hasSimulationMetadata) continue;

      if (literal.interactionComputed || literal.simulationComputed) {
        throw new Error(
          `Computed simulation metadata is forbidden at ${literal.file}:${literal.line}`,
        );
      }

      const uid = literalField(literal, "uid");
      const id = literalField(literal, "id");
      if (!uid || !id) {
        throw new Error(
          `Simulation descriptor must own literal uid/id at ${literal.file}:${literal.line}`,
        );
      }

      targets.push({
        uid,
        id,
        kind: literalField(literal, "kind") ?? "component",
        interactionType: literal.interaction?.type ?? null,
        valueContract: literal.interaction?.valueContract ?? null,
        simulationId: literal.simulation?.id ?? null,
        simulationKind: literal.simulation?.kind ?? null,
        routes: [...(routesByFile.get(literal.file) ?? new Set<string>())].sort(),
        repeated:
          isInsideIteratorCallback(literal.node) ||
          multiplicity.repeatingFiles.has(literal.file) ||
          literal.simulation?.kind === "list-item",
        sourceFile: literal.file,
        sourceLine: literal.line,
      });
    }
  }

  return targets.sort((left, right) => left.uid.localeCompare(right.uid));
}
