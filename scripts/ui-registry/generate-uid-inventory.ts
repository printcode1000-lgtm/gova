import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { collectUidCatalog, type UidCatalogEntry } from "@asol/architecture-core";

const OUTPUT = join("packages", "ui-registry-core", "src", "registry", "generated", "ui-uid-inventory.ts");

const BANNER = `/* GENERATED FILE. DO NOT EDIT BY HAND.
   Source: every literal { uid, id } UiRegistry descriptor in src/ and packages/, plus UI_PAGE_REGISTRY.
   Regenerate: npm run ui-registry:generated-catalog:generate
   Drift fails: npm run ui-registry:generated-catalog:check (also an architecture:check preflight) */
`;

function literal(entry: UidCatalogEntry): string {
  return [
    "  {",
    `    uid: ${JSON.stringify(entry.uid)},`,
    `    id: ${JSON.stringify(entry.id)},`,
    `    kind: ${JSON.stringify(entry.kind)},`,
    `    sourceFile: ${JSON.stringify(entry.sourceFile)},`,
    `    sourceLine: ${entry.sourceLine},`,
    "  },",
  ].join("\n");
}

export function renderUidInventory(root: string): string {
  const entries = collectUidCatalog(root);
  return [
    BANNER,
    'import type { UiUidCatalogEntry } from "../ui-uid-catalog-entry";',
    "",
    "export const UI_UID_INVENTORY: readonly UiUidCatalogEntry[] = [",
    ...entries.map(literal),
    "] as const as readonly UiUidCatalogEntry[];",
    "",
  ].join("\n");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const root = process.cwd();
  const rendered = renderUidInventory(root);
  const output = join(root, OUTPUT);
  const current = existsSync(output) ? readFileSync(output, "utf8") : "";
  if (current !== rendered) {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, rendered, "utf8");
    console.log(`Wrote ${OUTPUT}.`);
  } else {
    console.log(`${OUTPUT} already up to date.`);
  }
}
