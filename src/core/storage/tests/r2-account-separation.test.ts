import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { R2_STORAGE_TARGETS } from "../../config/r2-storage-topology";

/**
 * Guards the three-account R2 split.
 *
 * Account 1 (products): holds product images and nothing else.
 * Account 2 (general): holds profile images, covers, advertisements, and special orders.
 * Account 3 (ota): holds OTA release manifests, file trees, history, and transport bundles.
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
  ["packages", "ota-core", "src", "publishing", "adapters", "r2-storage.adapter.ts"],
  ["packages", "ota-core", "src", "publishing", "config", "ota-config.ts"],
  ["src", "core", "config", "server-env.values.ts"],
  ["src", "core", "config", "server-env", "server-env.values.auth-notifications.ts"],
  // The readiness catalog is the fourth place the chain lived. It listed
  // alternatives the publisher no longer accepts, which would have reported the
  // release console's OTA button ready and then failed inside the command.
  ["src", "modules", "release-commands", "domain", "build-command-catalog.ts"],
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
const otaConfig = stripComments(read("packages", "ota-core", "src", "publishing", "config", "ota-config.ts"));
for (const name of otaConfig.match(/(?<![A-Z0-9_])[A-Z][A-Z0-9_]*_R2_[A-Z0-9_]+/g) ?? []) {
  assert.ok(
    name.startsWith("ASOL_OTA_R2_"),
    `ota-config.ts reads ${name}. OTA has its own ASOL_OTA_R2_* credentials.`,
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

// ── 5. R2_STORAGE_TARGETS contains three distinct isolated targets ───────────

const targetKeys = Object.keys(R2_STORAGE_TARGETS).sort();
assert.deepEqual(
  targetKeys,
  ["general", "ota", "products"],
  "R2_STORAGE_TARGETS must contain exactly three distinct targets: general, ota, products.",
);

const { general, products, ota } = R2_STORAGE_TARGETS;
assert.notEqual(ota.accountId, general.accountId, "OTA accountId must not match general");
assert.notEqual(ota.accountId, products.accountId, "OTA accountId must not match products");
assert.notEqual(ota.endpoint, general.endpoint, "OTA endpoint must not match general");
assert.notEqual(ota.endpoint, products.endpoint, "OTA endpoint must not match products");
assert.notEqual(ota.bucketName, general.bucketName, "OTA bucketName must not match general");
assert.notEqual(ota.bucketName, products.bucketName, "OTA bucketName must not match products");
assert.notEqual(ota.publicUrl, general.publicUrl, "OTA publicUrl must not match general");
assert.notEqual(ota.publicUrl, products.publicUrl, "OTA publicUrl must not match products");

// ── 6. No reference to ASOL_OTA_LEGACY_R2_ in codebase ────────────────────────

const LEGACY_TOKEN = ["ASOL", "OTA", "LEGACY", "R2"].join("_");

function scanForLegacyOta(dir: string): string[] {
  const violations: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      violations.push(...scanForLegacyOta(fullPath));
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      if (fullPath === path.join(root, "src", "core", "storage", "tests", "r2-account-separation.test.ts")) {
        continue;
      }
      const content = readFileSync(fullPath, "utf8");
      if (content.includes(LEGACY_TOKEN)) {
        violations.push(path.relative(root, fullPath));
      }
    }
  }
  return violations;
}

const legacyViolations = [
  ...scanForLegacyOta(path.join(root, "packages", "ota-core", "src")),
  ...scanForLegacyOta(path.join(root, "src")),
  ...scanForLegacyOta(path.join(root, "scripts")),
];
assert.deepEqual(
  legacyViolations,
  [],
  `Found references to ASOL_OTA_LEGACY_R2_ in: ${legacyViolations.join(", ")}. ` +
    "The legacy mirror is completely removed; reintroducing it would silently republish to an account OTA no longer owns.",
);

console.log("R2 account separation contract passed.");
