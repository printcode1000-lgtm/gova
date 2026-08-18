/**
 * Guards on `deploy:push` target parsing and entrypoint.
 */

import assert from "node:assert/strict";

import "../deploy-push";
import { __testables } from "../deploy-push-target-choice";

const { parseProvidedTargets, expandSelection } = __testables;

assert.ok(true, "Importing deploy-push must not trigger a deployment.");

assert.deepEqual(parseProvidedTargets([]), null);
assert.deepEqual(parseProvidedTargets(["--vercel-target=notifications"]), ["notifications"]);
assert.deepEqual(
  parseProvidedTargets(["--vercel-target=main,products"]),
  ["products"],
);
assert.equal(parseProvidedTargets(["--vercel-target=all"]), "all");
assert.equal(parseProvidedTargets(["--vercel-target=main"]), "none");
assert.equal(parseProvidedTargets(["--vercel-target=none"]), "none");
assert.deepEqual(expandSelection("none"), []);
assert.deepEqual(expandSelection("all"), [
  "notifications",
  "products",
  "orders",
  "profiles",
]);

assert.throws(() => parseProvidedTargets(["--vercel-target=unknown"]), /Unknown Vercel target/);
assert.throws(
  () => parseProvidedTargets(["--vercel-target=all", "--vercel-target=main"]),
  /Pass --vercel-target=all alone/,
);
assert.throws(
  () => parseProvidedTargets(["--vercel-target=none", "--vercel-target=main"]),
  /Pass --vercel-target=none alone/,
);

console.log("deploy:push guard tests passed.");
