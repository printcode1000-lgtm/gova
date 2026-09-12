import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  SIMULATION_ACTORS,
  SIMULATION_BACKEND_PORT,
  simulationActorByKey,
  simulationActorByPort,
  simulationActorUrl,
} from "../index";
import {
  checkpointSimulationRoute,
  readSimulationRuntimeState,
  resetSimulationRuntimeState,
  setSimulationEnabled,
  simulationGatewaySecretMatches,
} from "../server";

assert.equal(SIMULATION_ACTORS.length, 10);
assert.deepEqual(
  SIMULATION_ACTORS.map((actor) => actor.port),
  [3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011],
);
assert.equal(SIMULATION_BACKEND_PORT, 3199);
assert.equal(
  simulationGatewaySecretMatches("same-secret", "same-secret"),
  true,
);
assert.equal(
  simulationGatewaySecretMatches("forged-secret", "same-secret"),
  false,
);
assert.equal(simulationGatewaySecretMatches(null, "same-secret"), false);
assert.equal(simulationActorByPort(3002)?.key, "buyer-01");
assert.equal(simulationActorByPort(3011)?.key, "super-admin");
assert.equal(simulationActorByKey("provider-03")?.port, 3010);
assert.equal(
  simulationActorUrl(SIMULATION_ACTORS[0], "/orders"),
  "http://127.0.0.1:3002/orders",
);
resetSimulationRuntimeState();
assert.equal(readSimulationRuntimeState().enabled, false);
setSimulationEnabled(true, "/super-admin/users?tab=all");
assert.equal(readSimulationRuntimeState().enabled, true);
assert.equal(
  readSimulationRuntimeState().normalRoute,
  "/super-admin/users?tab=all",
);
checkpointSimulationRoute("seller-01", "/orders?tab=seller#latest");
assert.equal(
  readSimulationRuntimeState().routes["seller-01"],
  "/orders?tab=seller#latest",
);
assert.throws(() =>
  checkpointSimulationRoute("seller-01", "https://example.com"),
);
resetSimulationRuntimeState();

const publicSource = readFileSync(
  new URL("../index.ts", import.meta.url),
  "utf8",
);
assert.doesNotMatch(publicSource, /SIM_[A-Z0-9_]+_PASSWORD/);
assert.doesNotMatch(publicSource, /process\.env/);

console.log("simulation-core tests passed");
