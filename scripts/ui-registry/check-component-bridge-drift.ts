import { readFileSync } from "node:fs";
import { join } from "node:path";

import { renderComponentMarkerBridge } from "./generate-component-marker-bridge";

const root = process.cwd();
const output = join(root, "packages", "ui-registry-core", "src", "pending", "generated", "component-marker-bridge.ts");
const rendered = renderComponentMarkerBridge(root);
const current = readFileSync(output, "utf8");
if (current !== rendered) {
  console.error(
    "packages/ui-registry-core/src/pending/generated/component-marker-bridge.ts is stale; " +
      "run npm run ui-registry:component-bridge:generate.",
  );
  process.exit(1);
}
console.log("Component marker bridge is up to date and generation is deterministic.");
