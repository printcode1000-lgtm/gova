import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import {
  KNOWN_UNSHIPPED,
  shippedRoutes,
  unshippedOwnedRoutes,
  type OwnedRoute,
} from "../route-ownership-coverage";

/**
 * An owner that does not ship the route it owns is a 404 in production.
 *
 * The registry decides which origin a client calls. Two gates already prove the
 * halves either side of that decision — every Business API route+method has
 * exactly one owner, and gova ships none of them — and nothing proved the
 * middle: that the chosen owner has a handler.
 *
 * It did not, for 63 pairs, including `POST /api/auth/login`. The cutover
 * declared ownership before the capability moved, so the boundary redirected
 * live traffic to deployments that answered `404`. A user session on `/home`
 * reported one of them; the rest were found by this check.
 *
 * `KNOWN_UNSHIPPED` is the remaining backlog. Every entry is a live 404, the
 * list may only shrink, and a pair that is not on it must be shipped by its
 * owner — which is what makes this gate catch the next one on the day it is
 * written instead of after it reaches production.
 */
const inventory = execFileSync("npx", ["tsx", "scripts/api-route-inventory.ts"], {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});

const owned: OwnedRoute[] = inventory
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [method, route, owner] = line.split("\t");
    return { method: method!, route: route!, owner: owner! };
  })
  .filter((entry) => entry.owner !== "gova/dev");

assert.ok(owned.length > 100, "the inventory must produce the owned route table");

const missing = unshippedOwnedRoutes(owned);
const known = new Set(KNOWN_UNSHIPPED);

const newlyMissing = missing.filter((pair) => !known.has(pair));
assert.deepEqual(
  newlyMissing,
  [],
  "A route whose owner ships no handler is a production 404. Ship it in the owning " +
    "service under services/<owner>/src/app, or change its owner in the registry:\n" +
    newlyMissing.map((pair) => `  - ${pair}`).join("\n"),
);

/** The backlog may only shrink: a fixed pair must be removed from the list. */
const staleEntries = KNOWN_UNSHIPPED.filter((pair) => !missing.includes(pair));
assert.deepEqual(
  staleEntries,
  [],
  "These pairs are shipped now and must be deleted from KNOWN_UNSHIPPED:\n" +
    staleEntries.map((pair) => `  - ${pair}`).join("\n"),
);

/** The reader that finds handlers must actually find them, or the gate is blind. */
const controlRoutes = shippedRoutes("services/control");
assert.ok(controlRoutes.size > 40, "control ships its migrated route tree");
assert.ok(
  controlRoutes.get("/api/system-logs")?.has("GET"),
  "the shipped-route reader must see a real exported handler",
);
assert.ok(
  shippedRoutes("services/submain").get("/api/auth/login")?.has("POST"),
  "submain must ship the login handler it owns",
);

console.log(
  `route ownership coverage: ${owned.length} owned pair(s), ${missing.length} awaiting their owner.`,
);
