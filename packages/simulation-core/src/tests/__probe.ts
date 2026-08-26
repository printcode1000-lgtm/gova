import { writeFileSync } from "node:fs";
import { discoverSimulationInstrumentation } from "../discovery/simulation-instrumentation-discovery";

const KIND_TO = { event: ["action", "tap"], field: ["field", "type"], "list-item": ["item", "tap"], file: ["field", "upload"], state: ["region", ""] } as Record<string, [string, string]>;
const seen = new Map<string, { kind: string; id: string; file: string }>();
for (const t of discoverSimulationInstrumentation(process.cwd())) {
  if (t.sourceFile.includes("/tests/") || t.sourceFile.includes("ui-registry-core") || t.sourceFile.includes("simulation-core")) continue;
  const key = `${t.kind}:${t.id}`;
  if (!seen.has(key)) seen.set(key, { kind: t.kind, id: t.id, file: t.sourceFile });
}
const entries = [...seen.values()].map((t) => ({
  simKind: t.kind, simId: t.id, id: t.id,
  kind: KIND_TO[t.kind]![0], interaction: KIND_TO[t.kind]![1] || null,
  file: t.file,
})).sort((a, b) => a.simId.localeCompare(b.simId));
writeFileSync("scripts/ui-registry/__remaining.json", JSON.stringify(entries, null, 2), "utf8");
console.log("still-manual candidates", entries.length);
