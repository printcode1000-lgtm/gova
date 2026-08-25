import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  pickRandomSimulationImage,
  resolveSimulationRuntime,
  SIMULATION_SCENARIOS,
  SIMULATION_USERS,
  USER_PAGE_REGISTRY,
} from "../index";

const manifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { exports: Record<string, unknown> };
assert.deepEqual(Object.keys(manifest.exports), [".", "./discovery"]);

assert.equal(SIMULATION_USERS.length, 9);
assert.equal(new Set(SIMULATION_USERS.map((user) => user.phone)).size, 9);
assert.deepEqual(
  SIMULATION_USERS.map((user) => user.password),
  ["1111", "2222", "3333", "1111", "2222", "3333", "1111", "2222", "3333"],
);
assert.deepEqual(
  SIMULATION_USERS.map((user) => user.storeName),
  ["مشتري 1", "مشتري 2", "مشتري 3", "بائع 1", "بائع 2", "بائع 3", "خدمة توصيل 1", "خدمة توصيل 2", "خدمة توصيل 3"],
);

assert.equal(SIMULATION_SCENARIOS.length, 0, "Version one scenarios must remain empty.");
assert.equal(new Set(USER_PAGE_REGISTRY.map((page) => page.route)).size, USER_PAGE_REGISTRY.length);
assert.ok(USER_PAGE_REGISTRY.length > 20);
for (const page of USER_PAGE_REGISTRY) {
  assert.ok(page.interactions.length > 0, `${page.route} must expose at least page loading.`);
  assert.equal(new Set(page.interactions.map((event) => event.id)).size, page.interactions.length);
}

assert.equal(resolveSimulationRuntime({ deployment: "static-export", platform: "web" }), "static-out");
assert.equal(resolveSimulationRuntime({ deployment: "static-export", platform: "android" }), "android");
assert.equal(resolveSimulationRuntime({ deployment: "static-export", platform: "ios" }), "ios");
assert.equal(resolveSimulationRuntime({ deployment: "local-development", platform: "web" }), "development");
assert.equal(resolveSimulationRuntime({ deployment: "web-production", platform: "web" }), "production");

const selected = pickRandomSimulationImage(["/catalog/a.webp"]);
assert.equal(selected, "/catalog/a.webp");
assert.throws(() => pickRandomSimulationImage([]), /simulationImagePoolEmpty/);

console.log(
  `@asol/simulation-core contract: ${USER_PAGE_REGISTRY.length} user pages, ` +
    `${USER_PAGE_REGISTRY.reduce((total, page) => total + page.interactions.length, 0)} events, 9 users, 0 scenarios.`,
);
