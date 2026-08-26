import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildSimulationRegistry, type GeneratedSimulationTarget } from "./simulation-registry-model";

const OUTPUT = join(
  "packages",
  "ui-registry-core",
  "src",
  "simulation",
  "generated",
  "ui-simulation-registry.ts",
);

const BANNER = `/* GENERATED FILE. DO NOT EDIT BY HAND.
   Source: the UiRegistry descriptors in src/ and packages/, plus UI_PAGE_REGISTRY.
   Regenerate: npm run ui-registry:simulation:generate
   Drift fails: npm run architecture:check */
`;

function literal(target: GeneratedSimulationTarget): string {
  const interaction = target.interactionType
    ? `{ type: ${JSON.stringify(target.interactionType)}${
        target.valueContract ? `, valueContract: ${JSON.stringify(target.valueContract)}` : ""
      } }`
    : "null";
  return [
    "  {",
    `    uid: ${JSON.stringify(target.uid)},`,
    `    id: ${JSON.stringify(target.id)},`,
    `    kind: ${JSON.stringify(target.kind)},`,
    `    interaction: ${interaction},`,
    `    simulationId: ${target.simulationId ? JSON.stringify(target.simulationId) : "null"},`,
    `    simulationKind: ${target.simulationKind ? JSON.stringify(target.simulationKind) : "null"},`,
    `    routes: [${target.routes.map((route) => JSON.stringify(route)).join(", ")}],`,
    `    repeated: ${target.repeated},`,
    `    sourceFile: ${JSON.stringify(target.sourceFile)},`,
    `    sourceLine: ${target.sourceLine},`,
    "  },",
  ].join("\n");
}

export function renderSimulationRegistry(root: string): string {
  const targets = buildSimulationRegistry(root).filter((target) => target.interactionType || target.simulationId);
  return [
    BANNER,
    'import type { UiSimulationTargetRecord } from "../simulation-registry.types";',
    "",
    "export const UI_SIMULATION_REGISTRY: readonly UiSimulationTargetRecord[] = [",
    ...targets.map(literal),
    "] as const as readonly UiSimulationTargetRecord[];",
    "",
  ].join("\n");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const root = process.cwd();
  const rendered = renderSimulationRegistry(root);
  const output = join(root, OUTPUT);
  const current = existsSync(output) ? readFileSync(output, "utf8") : "";
  if (current === rendered) {
    console.log(`UiSimulationRegistry is current (${OUTPUT}).`);
  } else {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, rendered, "utf8");
    console.log(`Generated ${OUTPUT}.`);
  }
}
