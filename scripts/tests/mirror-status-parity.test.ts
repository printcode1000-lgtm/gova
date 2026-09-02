import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * A moved route must answer the same status as the route it replaced.
 *
 * The compatibility boundary redirects a legacy client to its owner, and a
 * client cannot be moved to an origin that answers the same failure differently.
 * That is easy to get wrong in one direction only: most canonical routes map
 * errors through `mapServiceError`, but a minority carry their own mapping, and
 * a mirror written against the shared mapping silently downgrades those.
 *
 * It happened three times in one batch:
 *
 * - `profileNotFound` is a `404` in `/api/profile/reviews` (the rule is "a code
 *   containing NotFound is a 404") and a `500` in the shared mapping;
 * - `invalidHeroSliderConfig` and its siblings are `400` in the advertisements
 *   routes and `500` in the shared mapping;
 * - `featureFlagUnknown` is a `400` in `/api/feature-flags` and `500` in the
 *   shared mapping.
 *
 * Each turned a caller's mistake into a server fault at a new origin. This gate
 * refuses the shape that allows it: a canonical route with its own mapping may
 * not be mirrored by a route that uses only the generic responder.
 */
const ROOT = process.cwd();
const CANONICAL_ROOT = path.join(ROOT, "src", "app", "api");

const SERVICES = [
  "control",
  "notifications",
  "products",
  "orders",
  "profiles",
  "submain",
  "sub2main",
];

/** The generic responders. A bespoke canonical mapping may not use only these. */
const GENERIC_RESPONDERS = [
  "businessErrorResponse",
  "controlError",
  "profileErrorResponse",
  "sellerErrorResponse",
  "searchErrorResponse",
];

/** Routes whose canonical handler maps statuses itself instead of `mapServiceError`. */
function bespokeCanonicalRoutes(): Set<string> {
  const found = new Set<string>();
  const stack = [CANONICAL_ROOT];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (item.name !== "route.ts") continue;
      const source = readFileSync(full, "utf8");
      if (!source.includes("apiError(") || source.includes("mapServiceError")) continue;
      found.add(full.slice(CANONICAL_ROOT.length).replace(/\/route\.ts$/, ""));
    }
  }
  return found;
}

const bespoke = bespokeCanonicalRoutes();
assert.ok(bespoke.size > 0, "the canonical tree must contain routes with their own mapping");

const violations: string[] = [];
for (const service of SERVICES) {
  const base = path.join(ROOT, "services", service, "src", "app", "api");
  if (!existsSync(base)) continue;

  for (const route of bespoke) {
    const mirror = path.join(base, route, "route.ts");
    if (!existsSync(mirror)) continue;

    const source = readFileSync(mirror, "utf8");

    // Three shapes keep parity, and each is a real answer to "who decides the
    // status?". Delegation is the strongest: the mirror calls the canonical
    // handler, so there is one mapping and it cannot drift.
    if (/from '@\/app\/api\//.test(source)) continue;

    // A named responder that is not one of the generic ones is a ported mapping.
    const named = new Set(
      [...source.matchAll(/(\w*[eE]rrorResponse|controlError)\(/g)].map((match) => match[1]!),
    );
    if ([...named].some((name) => !GENERIC_RESPONDERS.includes(name))) continue;

    // Or the route decides inline, with an explicit non-2xx status literal.
    if (/status:\s*(4\d\d|5\d\d)/.test(source)) continue;

    violations.push(
      `services/${service}/src/app/api${route}: ${
        named.size === 0 ? "no error responder at all" : `uses only ${[...named].join(", ")}`
      }, but src/app/api${route} maps statuses itself`,
    );
  }
}

assert.deepEqual(
  violations,
  [],
  "A mirrored route must answer the same status as the canonical route it replaced. " +
    "Port the canonical mapping into the service's http lib as a named responder:\n" +
    violations.map((entry) => `  - ${entry}`).join("\n"),
);

console.log(
  `mirror status parity: ${bespoke.size} canonical route(s) map statuses themselves; every mirror of one carries its own responder.`,
);
