import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadSrcTsx } from "./apply-to-repo";
import { requiredDomIdForwardingKeys } from "./check-static-dom-ids";
import { applyDomIdForwarding } from "./dom-id-forwarding";

export function applyIdForwardingToRepo(root: string): number {
  const sources = loadSrcTsx(root);
  let edited = 0;
  for (const key of requiredDomIdForwardingKeys(sources)) {
    const hash = key.indexOf("#");
    const file = key.slice(0, hash);
    const name = key.slice(hash + 1);
    const source = sources.get(file);
    if (!source) continue;
    const next = applyDomIdForwarding(source, file, name);
    if (next === source) continue;
    sources.set(file, next);
    writeFileSync(join(root, file), next, "utf8");
    edited += 1;
  }
  return edited;
}

if (process.argv[1]?.includes("apply-id-forwarding")) {
  const edited = applyIdForwardingToRepo(process.cwd());
  console.log(`Forwarded id on ${edited} repeating component export(s).`);
}
