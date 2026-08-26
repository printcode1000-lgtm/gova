/**
 * Guards on `deploy:push` target parsing and entrypoint.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { __testables as deployPushTestables } from "../deploy-push";
import { __testables } from "../deploy-push-target-choice";

const { parseProvidedTargets, expandSelection } = __testables;
const {
  parseArgv,
  compareVersions,
  SCRATCH_FILE_PATTERNS,
  RELEASE_MANIFEST,
  formatSuccessLine,
  FAIL_PREFIX,
} = deployPushTestables;

assert.ok(true, "Importing deploy-push must not trigger a deployment.");

assert.deepEqual(parseArgv(["--vercel-target=none"]), {
  flags: {
    allowEmpty: false,
    allowManifestDowngrade: false,
    allowScratchFiles: false,
  },
  targetArgs: ["--vercel-target=none"],
});
assert.deepEqual(parseArgv(["--allow-empty", "--allow-scratch-files"]), {
  flags: {
    allowEmpty: true,
    allowManifestDowngrade: false,
    allowScratchFiles: true,
  },
  targetArgs: [],
});
assert.equal(parseArgv(["--allow-manifest-downgrade"]).flags.allowManifestDowngrade, true);
assert.throws(() => parseArgv(["--skip-preflight"]), /Unknown option/);

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
  "submain",
  "sub2main",
]);
assert.deepEqual(parseProvidedTargets(["--vercel-target=submain"]), ["submain"]);
assert.deepEqual(parseProvidedTargets(["--vercel-target=sub2main"]), ["sub2main"]);

assert.throws(() => parseProvidedTargets(["--vercel-target=unknown"]), /Unknown Vercel target/);
assert.throws(
  () => parseProvidedTargets(["--vercel-target=all", "--vercel-target=main"]),
  /Pass --vercel-target=all alone/,
);
assert.throws(
  () => parseProvidedTargets(["--vercel-target=none", "--vercel-target=main"]),
  /Pass --vercel-target=none alone/,
);

assert.ok(compareVersions("0.1.0", "0.1.15") < 0);
assert.ok(compareVersions("0.1.15", "0.1.0") > 0);
assert.equal(compareVersions("0.1.15", "0.1.15"), 0);
assert.equal(RELEASE_MANIFEST, "public/asol-web-manifest.json");
assert.equal(FAIL_PREFIX, "[deploy:push] FAILED —");
assert.match(formatSuccessLine([]), /main Vercel production target is READY/);
assert.match(formatSuccessLine(["products"]), /main and products/);
const deployPushSource = readFileSync(new URL("../deploy-push.ts", import.meta.url), "utf8");
assert.match(
  deployPushSource,
  /Promise\.allSettled\(\[\s*deploySelectedAccounts\(/,
  "deploy:push must start all selected isolated targets and main verification together.",
);
for (const entry of ["debug.log", "notes.tmp", "src/__probe__.ts", "scratchpad/out.txt"]) {
  assert.ok(
    SCRATCH_FILE_PATTERNS.some((pattern) => pattern.test(entry)),
    `${entry} must be blocked by deploy:push unless explicitly allowed.`,
  );
}

console.log("deploy:push guard tests passed.");
