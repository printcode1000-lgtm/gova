import { readFileSync } from "node:fs";
import { join } from "node:path";

import { renderUidInventory } from "./generate-uid-inventory";

const root = process.cwd();
const output = join(root, "packages", "ui-registry-core", "src", "registry", "generated", "ui-uid-inventory.ts");
const rendered = renderUidInventory(root);
const current = readFileSync(output, "utf8");
if (current !== rendered) {
  console.error(
    "packages/ui-registry-core/src/registry/generated/ui-uid-inventory.ts is stale; " +
      "run npm run ui-registry:generated-catalog:generate.",
  );
  process.exit(1);
}
console.log("UID inventory is up to date and generation is deterministic.");
