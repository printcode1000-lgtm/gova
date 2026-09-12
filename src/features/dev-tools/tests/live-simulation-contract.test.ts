import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const stateRoute = read("src/app/api/dev/simulation/state/route.ts");
const sessionRoute = read("src/app/api/dev/simulation/session/route.ts");
const checkpointRoute = read("src/app/api/dev/simulation/checkpoint/route.ts");
const badge = read("src/features/dev-tools/presentation/DeveloperBadge.tsx");
const runtime = read("src/features/dev-tools/presentation/SimulationRuntimeController.tsx");
const gateway = read("scripts/dev-simulation.ts");
const layout = read("src/app/layout.tsx");

for (const source of [stateRoute, sessionRoute, checkpointRoute]) {
  assert.match(source, /assertDevelopmentToolingAllowed\([\s\S]*strict:\s*true/);
}
assert.match(sessionRoute, /simulationGatewayUnauthorized/);
assert.match(sessionRoute, /apiError\("forbidden",\s*403/);
assert.match(badge, /aria-label="وضع محاكاة الحسابات"/);
assert.match(badge, /setSimulationMode\(enabled/);
assert.match(badge, /simulationState\?\.enabled && simulationState\.actorKey/);
assert.match(runtime, /aria-label="إيقاف وضع المحاكاة"/);
assert.match(runtime, /setSimulationMode\(false/);
assert.match(runtime, /window\.location\.assign/);
assert.match(layout, /SimulationRuntimeController/);
assert.match(gateway, /const LISTEN_HOST = LOOPBACK/);
assert.match(gateway, /isTrustedActorMutationOrigin/);
assert.match(gateway, /SIMULATION_PROXY_SECRET_HEADER/);
assert.match(gateway, /direct backend must reject unsigned simulation actor headers/);
assert.match(gateway, /cross-origin actor session bootstrap must be 403/);
assert.match(gateway, /cleanupStaleRuntime/);
assert.match(gateway, /resetSimulationRuntimeState\(\)/);
assert.doesNotMatch(runtime, /title=/);

console.log("Live simulation contract tests passed.");
