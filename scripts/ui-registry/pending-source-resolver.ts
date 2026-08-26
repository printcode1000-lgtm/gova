import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import {
  componentsForLocator,
  findUiRegistrySourceMatches,
  type UiRegistryPendingRequest,
} from "@asol/ui-registry-core";

export interface ResolvedPendingSource {
  /** Repository-relative file that holds the single matching usage site. */
  file: string;
  /** Character offset of the `<` that opens the tag. */
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
      return entry === "node_modules" ? [] : tsxFiles(full);
    }
    return entry.endsWith(".tsx") ? [full] : [];
  });
}

/**
 * Finds the one usage site a pending request means, or refuses.
 *
 * The locator never carried a path — a production client has none to give — so
 * the match is proven here, locally, against the working tree: the component
 * the published marker maps to, still unregistered, and carrying the same
 * author-written DOM id the element published. The result is accepted only when
 * exactly one such site exists in the entire repository. Zero matches and two
 * matches are both refusals, because the alternative is editing a file the
 * super admin never touched.
 */
export function resolvePendingSource(
  request: UiRegistryPendingRequest,
  root: string,
): PendingSourceResolution {
  if (componentsForLocator(request.locator).length === 0) {
    return {
      ok: false,
      reason: `no JSX component is mapped to the "${request.locator.component}" marker`,
    };
  }
  if (request.locator.anchor === null) {
    return {
      ok: false,
      reason:
        "the element published no stable DOM id, so the usage site cannot be proven unique; register it by hand",
    };
  }

  const found: ResolvedPendingSource[] = [];
  for (const file of tsxFiles(join(root, "src"))) {
    const source = readFileSync(file, "utf8");
    for (const match of findUiRegistrySourceMatches(source, request.locator)) {
      found.push({
        file: relative(root, file).replace(/\\/g, "/"),
        index: match.index,
        line: match.line,
        component: match.component,
      });
    }
  }

  if (found.length === 0) {
    return {
      ok: false,
      reason: `no unregistered <${componentsForLocator(request.locator).join("|")}> with id "${request.locator.anchor}" exists in src/`,
    };
  }
  if (found.length > 1) {
    return {
      ok: false,
      reason: `ambiguous source: ${found.length} usage sites match (${found
        .map((entry) => `${entry.file}:${entry.line}`)
        .join(", ")})`,
    };
  }
  return { ok: true, source: found[0]! };
}
