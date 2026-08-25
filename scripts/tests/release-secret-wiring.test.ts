import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.match(manifest.scripts["ota:sync:cors"] ?? "", /ota-cloudflare/);
assert.equal(manifest.scripts["ota:self-test"], "npx tsx scripts/run-ota-self-test.ts --r2");
assert.equal(manifest.scripts["ota:self-test:local"], "npx tsx scripts/run-ota-self-test.ts");
assert.match(manifest.scripts["ota:publish"] ?? "", /google-play ota/);

const scopeSource = readFileSync("scripts/ensure-release-secrets-restored.ts", "utf8");
for (const required of ["ASOL_OTA_R2_ENDPOINT", "ASOL_OTA_R2_API_TOKEN"]) {
  assert.match(scopeSource, new RegExp(`["]${required}["]`));
}

const selfTestSource = readFileSync("scripts/run-ota-self-test.ts", "utf8");
assert.match(selfTestSource, /args\.includes\("--r2"\)/);
assert.match(selfTestSource, /\["ota-signing", "ota-storage"\]/);
assert.match(selfTestSource, /\["ota-signing"\]/);

const corsSource = readFileSync("packages/ota-core/scripts/sync-cors.ts", "utf8");
assert.match(corsSource, /loadReleaseToolEnvironment\(\)/);
assert.doesNotMatch(corsSource, /dotenv\.config/);

const fastfile = readFileSync("fastlane/Fastfile", "utf8");
assert.match(fastfile, /api_key: configured_app_store_connect_api_key/);
assert.match(fastfile, /app_store_connect_api_key\(/);

console.log("Release secret auto-restore and provider wiring tests passed.");
