import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { findPendingAstSourceMatches } from "@asol/architecture-core";
import {
  componentsForLocator,
  type UiRegistryPendingRequest,
} from "@asol/ui-registry-core";

export interface ResolvedPendingSource {
  file: string;
  index: number;
  line: number;
  component: string;
}

export type PendingSourceResolution =
  | { ok: true; source: ResolvedPendingSource }
  | { ok: false; reason: string };

function tsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      return entry === "node_modules" || entry === "tests" || entry === "__tests__" || entry === "generated" ? [] : tsxFiles(full);
    }
    return entry.endsWith(".tsx") ? [full] : [];
  });
}

function locatorComponents(request: UiRegistryPendingRequest): readonly string[] {
  const bridged = componentsForLocator(request.locator);
  if (bridged.length > 0) return bridged;
  // Raw intrinsic markers are already their own JSX tag names.
  return /^[a-z][a-z0-9-]*$/.test(request.locator.component)
    ? [request.locator.component]
    : [];
}

/**
 * Finds exactly one AST usage site. The production locator carries no file
 * path; local tooling proves uniqueness from marker + stable author DOM id.
 */
export function resolvePendingSource(
  request: UiRegistryPendingRequest,
  root: string,
): PendingSourceResolution {
  const components = locatorComponents(request);
  if (components.length === 0) {
    return { ok: false, reason: `no project JSX component or intrinsic is mapped to the "${request.locator.component}" marker` };
  }
  if (request.locator.anchor === null) {
    return {
      ok: false,
      reason: "the element published no stable DOM id, so the usage site cannot be proven unique; register it by hand",
    };
  }

  const found: ResolvedPendingSource[] = [];
  for (const rootDirectory of [join(root, "src"), join(root, "packages")]) {
    if (!statSync(rootDirectory, { throwIfNoEntry: false })?.isDirectory()) continue;
    for (const file of tsxFiles(rootDirectory)) {
      const label = relative(root, file).replace(/\\/g, "/");
      const source = readFileSync(file, "utf8");
      for (const match of findPendingAstSourceMatches(label, source, components, request.locator.anchor)) {
        found.push({ file: label, index: match.index, line: match.line, component: match.component });
      }
    }
  }

  if (found.length === 0) {
    return {
      ok: false,
      reason: `no unregistered <${components.join("|")}> with id "${request.locator.anchor}" exists in project source`,
    };
  }
  if (found.length > 1) {
    return {
      ok: false,
      reason: `ambiguous source: ${found.length} usage sites match (${found.map((entry) => `${entry.file}:${entry.line}`).join(", ")})`,
    };
  }
  return { ok: true, source: found[0]! };
}
