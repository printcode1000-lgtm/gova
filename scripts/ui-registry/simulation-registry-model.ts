import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { UI_PAGE_REGISTRY } from "@asol/ui-registry-core";

/**
 * Reads the registry that already exists in source and turns it into the
 * generated simulation catalog.
 *
 * Nothing here is authored: the descriptors supply identity, interaction and
 * simulation id, and the import graph supplies the routes. That is the whole
 * point — a hand-maintained target list is a second source of truth, and the
 * two drift the first time someone renames a control.
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

function sourceFiles(directory: string): string[] {
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) return [];
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      return entry === "node_modules" || entry === "tests" ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

function balanced(source: string, openIndex: number): string | null {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }
  return null;
}

function repeatedRegions(source: string): Array<[number, number]> {
  const regions: Array<[number, number]> = [];
  for (const match of source.matchAll(/\.(?:map|flatMap)\s*\(/g)) {
    const open = source.indexOf("(", match.index! + 1);
    if (open === -1) continue;
    let depth = 0;
    for (let index = open; index < source.length; index += 1) {
      const character = source[index];
      if (character === "(") depth += 1;
      else if (character === ")") {
        depth -= 1;
        if (depth === 0) {
          regions.push([open, index]);
          break;
        }
      }
    }
  }
  return regions;
}

function field(body: string, name: string): string | null {
  return body.match(new RegExp(`\\b${name}:\\s*["']([^"']+)["']`))?.[1] ?? null;
}

/** Walks back from a `uid:` field to the object literal that declares it. */
function enclosingLiteral(source: string, uidIndex: number): { body: string; start: number } | null {
  let depth = 0;
  for (let index = uidIndex; index >= 0; index -= 1) {
    const character = source[index];
    if (character === "}") depth += 1;
    else if (character === "{") {
      if (depth === 0) {
        const body = balanced(source, index);
        return body === null ? null : { body, start: index };
      }
      depth -= 1;
    }
  }
  return null;
}

/**
 * Every descriptor literal in source, whatever shape declares it.
 *
 * Descriptors appear inline (`ui={{ … }}`), as named constants, and as members
 * of typed maps. Anchoring on the `uid:` field rather than on a call site is
 * what makes all three visible to one scan — a generator that understood only
 * one shape would silently omit the rest.
 */
export function collectDescriptorLiterals(
  root: string,
): Array<{ body: string; file: string; line: number; repeated: boolean }> {
  const literals: Array<{ body: string; file: string; line: number; repeated: boolean }> = [];
  for (const directory of [join(root, "src"), join(root, "packages")]) {
    for (const file of sourceFiles(directory)) {
      const label = relative(root, file).replace(/\\/g, "/");
      if (label.startsWith("packages/ui-registry-core/")) continue;
      const source = readFileSync(file, "utf8");
      const regions = repeatedRegions(source);
      for (const match of source.matchAll(/\buid:\s*["']/g)) {
        const literal = enclosingLiteral(source, match.index!);
        if (!literal) continue;
        literals.push({
          body: literal.body,
          file: label,
          line: source.slice(0, literal.start).split("\n").length,
          repeated: regions.some(([open, close]) => literal.start > open && literal.start < close),
        });
      }
    }
  }
  return literals;
}

/** Files a page can reach through `@/` and relative imports. */
function reachableFiles(root: string, entry: string): Set<string> {
  const pending = [entry];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    let source: string;
    try {
      source = readFileSync(current, "utf8");
    } catch {
      continue;
    }
    for (const match of source.matchAll(
      /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    )) {
      const specifier = match[1]!;
      let candidate: string;
      if (specifier.startsWith("@/")) candidate = join(root, "src", specifier.slice(2));
      else if (specifier.startsWith(".")) candidate = resolve(dirname(current), specifier);
      else if (specifier.startsWith("@asol/")) {
        // A package door: follow it so a descriptor inside a shared package is
        // attributed to the pages that actually render it.
        const [, folder] = specifier.split("/");
        candidate = join(root, "packages", folder ?? "", "src", "index");
      } else continue;
      for (const suffix of ["", ".ts", ".tsx", "/index.ts", "/index.tsx", "/ui.ts", "/server.ts"]) {
        const resolved = `${candidate}${suffix}`;
        if (statSync(resolved, { throwIfNoEntry: false })?.isFile()) {
          pending.push(resolved);
          break;
        }
      }
    }
  }
  return visited;
}

/**
 * Every file that renders a route: its page and every layout above it.
 *
 * The shell lives in layouts — the header search box is not imported by any
 * page — so a page-only walk would report half the registered controls as
 * unrenderable on every route.
 */
function routeEntries(root: string, route: string): string[] {
  const segments = route === "/" ? [] : route.slice(1).split("/");
  const entries = [join(root, "src", "app", "layout.tsx")];
  let directory = join(root, "src", "app");
  for (const segment of segments) {
    directory = join(directory, segment);
    entries.push(join(directory, "layout.tsx"));
  }
  entries.push(join(directory, "page.tsx"));
  return entries.filter((entry) => statSync(entry, { throwIfNoEntry: false })?.isFile());
}

/** Builds the generated catalog from the descriptors found in source. */
export function buildSimulationRegistry(root: string): GeneratedSimulationTarget[] {
  const routesByFile = new Map<string, string[]>();
  for (const page of UI_PAGE_REGISTRY) {
    for (const entry of routeEntries(root, page.route)) {
      for (const file of reachableFiles(root, entry)) {
        const label = relative(root, file).replace(/\\/g, "/");
        routesByFile.set(label, [...(routesByFile.get(label) ?? []), page.route]);
      }
    }
  }

  const targets: GeneratedSimulationTarget[] = [];
  for (const literal of collectDescriptorLiterals(root)) {
    const uid = field(literal.body, "uid");
    const id = field(literal.body, "id");
    if (!uid || !id) continue;
    const simulation = literal.body.match(
      /simulation:\s*\{\s*kind:\s*["']([^"']+)["']\s*,\s*id:\s*["']([^"']+)["']\s*\}/,
    );
    const interaction = literal.body.match(
      /interaction:\s*\{\s*type:\s*["']([^"']+)["'](?:\s*,\s*valueContract:\s*["']([^"']+)["'])?\s*\}/,
    );
    if (!simulation && !interaction) continue;
    targets.push({
      uid,
      id,
      kind: field(literal.body, "kind") ?? "component",
      interactionType: interaction?.[1] ?? null,
      valueContract: interaction?.[2] ?? null,
      simulationId: simulation?.[2] ?? null,
      simulationKind: simulation?.[1] ?? null,
      routes: [...new Set(routesByFile.get(literal.file) ?? [])].sort(),
      repeated: literal.repeated || simulation?.[1] === "list-item",
      sourceFile: literal.file,
      sourceLine: literal.line,
    });
  }
  return targets.sort((left, right) => left.uid.localeCompare(right.uid));
}
