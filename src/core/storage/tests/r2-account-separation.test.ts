import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Guards the two-account R2 split.
 *
 * One account holds product images; the other holds everything else. That was
 * the intent from the start, and it silently stopped being true: OTA release
 * publishing fell back from `ASOL_OTA_R2_*` to `PRODUCT_R2_*`, and 3,463 build
 * artefacts — 50 MB — accumulated on the product account, outnumbering the one
 * product image on it by three orders of magnitude.
 *
 * A fallback across an account boundary is the failure mode: it does not error,
 * it writes somewhere else. These assertions are about shape, not about live
 * buckets, so they run offline and fail at the moment the shape returns.
 */

const root = process.cwd();
const read = (...segments: string[]) =>
  readFileSync(path.join(root, ...segments), "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

// ── 1. Exactly one storage profile may use the product account ───────────────

interface StorageProfileEntry {
  id: string;
  provider: string;
}

const profiles = (
  JSON.parse(read("src", "config", "storage-profiles.json")) as {
    profiles: StorageProfileEntry[];
  }
).profiles;

const productProfiles = profiles
  .filter((profile) => profile.provider === "CloudflareR2Products")
  .map((profile) => profile.id);

assert.deepEqual(
  productProfiles,
  ["product-default"],
  "The product R2 account serves product images and nothing else. " +
    `Profiles pointing at it: ${productProfiles.join(", ") || "none"}.`,
);

for (const profile of profiles) {
  assert.ok(
    profile.provider === "CloudflareR2" ||
      profile.provider === "CloudflareR2Products",
    `Storage profile "${profile.id}" uses ${profile.provider}, which is neither R2 account.`,
  );
}

// ── 2. OTA may not inherit either account's credentials ──────────────────────

const otaSources = [
  ["scripts", "ota", "ota-r2.ts"],
  ["scripts", "ota", "ota-config.ts"],
  ["src", "core", "config", "server-env.values.ts"],
] as const;

for (const segments of otaSources) {
  const file = path.join(...segments);
  const source = stripComments(read(...segments));
  // Every R2 variable named anywhere near an OTA one must itself be an OTA one.
  // Stated as a rule rather than a blocklist, so a credential added later is
  // covered without anyone remembering to list it — and so this file never has
  // to spell a secret's name.
  const R2_VARIABLE = /(?<![A-Z0-9_])[A-Z][A-Z0-9_]*_R2_[A-Z0-9_]+/g;
  for (const line of source.split("\n")) {
    if (!line.includes("ASOL_OTA_R2_")) continue;
    for (const name of line.match(R2_VARIABLE) ?? []) {
      assert.ok(
        name.startsWith("ASOL_OTA_R2_"),
        `${file} falls back from an OTA credential to ${name}. ` +
          "A fallback across accounts writes to the wrong bucket instead of failing.",
      );
    }
  }
}

// Same rule stated the other way: the OTA config module may name no R2 variable
// that is not its own, on any line.
const otaConfig = stripComments(read("scripts", "ota", "ota-config.ts"));
for (const name of otaConfig.match(/(?<![A-Z0-9_])[A-Z][A-Z0-9_]*_R2_[A-Z0-9_]+/g) ?? []) {
  assert.ok(
    name.startsWith("ASOL_OTA_R2_"),
    `scripts/ota/ota-config.ts reads ${name}. OTA has its own ASOL_OTA_R2_* credentials.`,
  );
}

// ── 3. Reading an image may not require an account-management token ──────────

const s3Client = stripComments(read("src", "core", "provisioning", "r2-s3-client.ts"));
for (const [fn, body] of [
  ["r2ObjectExists", /export async function r2ObjectExists[\s\S]*?\n}/],
  ["productR2ObjectExists", /export async function productR2ObjectExists[\s\S]*?\n}/],
] as const) {
  const match = body.exec(s3Client);
  assert.ok(match, `${fn} not found in r2-s3-client.ts`);
  assert.doesNotMatch(
    match[0],
    /getR2Config\(\)|getProductR2Config\(\)/,
    `${fn} pulls the full R2 config, which requires an *_API_TOKEN. An existence ` +
      "check is not an account operation, and the read-only deployments hold no such token.",
  );
}

for (const provider of [
  "cloudflare-r2.provider.server.ts",
  "cloudflare-r2-products.provider.server.ts",
]) {
  const source = stripComments(read("src", "core", "storage", "providers", provider));
  const match = /resolvePublicUrl\([\s\S]*?\n  }/.exec(source);
  assert.ok(match, `resolvePublicUrl not found in ${provider}`);
  assert.doesNotMatch(
    match[0],
    /getR2Config\(\)|getProductR2Config\(\)/,
    `${provider}: resolvePublicUrl pulls the full R2 config. Turning a key into a ` +
      "URL needs the public base URL alone.",
  );
}

// ── 4. Product images are stored as keys, never as URLs ──────────────────────

const repository = stripComments(
  read(
    "src",
    "modules",
    "data-access",
    "domains",
    "product",
    "repositories",
    "product-repository.ts",
  ),
);
assert.match(
  repository,
  /JSON\.stringify\(\s*record\.images\.map\(\(image\) => \(\{ imageKey: image\.imageKey \}\)\)/,
  "products.images_json must persist keys only. A stored URL bakes the bucket's " +
    "hostname into every row, so moving the bucket means rewriting the data.",
);

// The read side is the half that fails silently: a parser still demanding `url`
// drops every migrated row and the product simply shows no images.
const parseImages = /function parseImages\([\s\S]*?\n}/.exec(repository);
assert.ok(parseImages, "parseImages not found in product-repository.ts");
assert.doesNotMatch(
  parseImages[0],
  /image\.url/,
  "parseImages requires a stored `url`. Rows hold keys only, so every image " +
    "would be filtered away and products would render with none.",
);

console.log("R2 account separation contract passed.");
