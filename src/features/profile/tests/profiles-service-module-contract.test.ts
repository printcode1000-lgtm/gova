import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveRouteOwner } from "@asol/account-bridge/routes";

/**
 * Guards the profiles service module.
 *
 * The service is deployed from `services/profiles` alone, and the deployments
 * must never call each other. Three properties keep that true, and none of them
 * survives on convention:
 *
 * 1. Nothing in the folder may import outside it. A stray `../../src` import
 *    passes locally — the files are right there — and fails only on Vercel.
 * 2. The service serves reads only. Profile writes go through image storage and
 *    touch product-derived counts, so they cannot move here.
 * 3. `generated/` must be reproducible from `src/`. It is a mirror, not a fork.
 */

const root = process.cwd();
const serviceRoot = path.join(root, "services", "profiles");
const generatedRoot = path.join(serviceRoot, "generated", "src");

function filesBelow(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? filesBelow(target) : [target];
  });
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

// ── 1. The module's own source must be self-contained ────────────────────────

const specifierPattern = /\bfrom\s+['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const directory of [path.join(serviceRoot, "src"), path.join(serviceRoot, "stubs")]) {
  for (const file of filesBelow(directory)) {
    if (!/\.(ts|tsx|js)$/.test(file)) continue;
    const content = readFileSync(file, "utf8");
    specifierPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = specifierPattern.exec(content)) !== null) {
      const specifier = match[1] ?? match[2];
      if (!specifier.startsWith(".")) continue;
      const resolved = path.resolve(path.dirname(file), specifier);
      assert.ok(
        resolved.startsWith(serviceRoot),
        `${path.relative(root, file)} imports outside the service folder: ${specifier}. ` +
          "Only services/profiles is uploaded, so the build would fail on Vercel.",
      );
    }
  }
}

// ── 2. Read-only: no write handlers may be served here ───────────────────────

for (const file of filesBelow(path.join(serviceRoot, "src", "app", "api"))) {
  if (!file.endsWith("route.ts")) continue;
  const code = stripComments(readFileSync(file, "utf8"));
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.doesNotMatch(
      code,
      new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`),
      `${path.relative(root, file)} exports ${method}. The profiles service is read-only: ` +
        "profile writes go through image storage and touch product-derived counts.",
    );
  }
}

// ── 3. Routes this account cannot serve must NOT live here ───────────────────

/**
 * The rule, restated after the cutover.
 *
 * It used to end "they belong to the main app". That destination no longer
 * exists: gova ships no Business API, so every route lives on the account whose
 * credentials it needs, and "not here" now has to name where instead.
 *
 * `reviews` reads the product database as well as the profile shards and this
 * account holds no product credential — it belongs to `sub2main`, which holds
 * both, and the route registry says so. `editor` is a write, and this account is
 * read-only.
 *
 * `discounts` and `store-images` were on this list too, and the reason given for
 * them was wrong. `listSellerDiscounts` reads `sellerDiscountRepository` and
 * nothing else — the `profile-promotions` shard this account already holds.
 * `getStoreImages` reads the profile shard and then asks image storage whether
 * each key still exists, which is a read against the R2 credentials this account
 * already holds. Both are served here.
 */
for (const absent of ["reviews", "editor"]) {
  assert.ok(
    !existsSync(path.join(serviceRoot, "src", "app", "api", "profile", absent)),
    `/api/profile/${absent} needs a capability this account does not hold: reviews ` +
      "reads the product database (owned by sub2main) and editor is a write.",
  );
}

for (const present of ["discounts", "store-images"]) {
  assert.ok(
    existsSync(path.join(serviceRoot, "src", "app", "api", "profile", present)),
    `/api/profile/${present} is owned by this account and must ship here — an owner ` +
      "that ships no handler is a production 404.",
  );
}

// ── 4. The bridge must not redirect anything but browser reads ───────────────

const bridge = stripComments(
  readFileSync(
    path.join(root, "packages", "account-bridge", "src", "index.ts"),
    "utf8",
  ),
);
assert.match(
  bridge,
  /resolveRouteOwner\(method, pathOf\(route\)\)/,
  "The bridge must take ownership from the canonical registry. It used to redirect GET only, " +
    "which was a safe approximation while every write stayed on the main app; now writes have " +
    "their own owners and a hardcoded method rule would send them to the wrong one.",
);
assert.match(
  bridge,
  /isBrowser\(\)/,
  "The service bridge must be browser-only: server-side redirection would make the deployments call each other.",
);
// The bridge no longer carries route literals at all — ownership lives in the
// registry — so the invariant is asserted where the decision is now made.
// Reviews are the one profile family this account cannot serve at all: the read
// joins product-derived data, and `asol-profiles` holds no product credential.
// Read and write both belong to the account that holds both databases — the
// registry had the read here, and it answered 404 in production because the
// handler could never live here.
assert.equal(
  resolveRouteOwner("GET", "/api/profile/reviews"),
  "sub2main",
  "Reading a review touches the product database, so it belongs to the account that holds it.",
);
assert.equal(
  resolveRouteOwner("POST", "/api/profile/reviews"),
  "sub2main",
  "Writing a review touches the product database, so it belongs to the write account, not profiles.",
);
// The reads this account genuinely owns still resolve here.
assert.equal(
  resolveRouteOwner("GET", "/api/profile/store-details"),
  "profiles",
  "A pure profile-shard read stays with the profile account.",
);

// ── 5. generated/ must be reproducible from src/ ─────────────────────────────

function fingerprint(directory: string): string {
  const hash = createHash("sha256");
  for (const file of filesBelow(directory).sort()) {
    hash.update(path.relative(directory, file).split(path.sep).join("/"));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}

const committed = fingerprint(generatedRoot);
assert.notEqual(
  committed,
  createHash("sha256").digest("hex"),
  "generated/src is empty — run `npx tsx scripts/sync-profiles-service-sources.ts` first.",
);

const probe = mkdtempSync(path.join(tmpdir(), "asol-profiles-sync-"));
try {
  execFileSync(
    process.execPath,
    [path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), "scripts/sync-profiles-service-sources.ts", "--out", probe],
    { cwd: root, stdio: "pipe", shell: false },
  );
  assert.equal(
    committed,
    fingerprint(path.join(probe, "src")),
    "services/profiles/generated is stale. Run " +
      "`npx tsx scripts/sync-profiles-service-sources.ts` and redeploy.",
  );
} finally {
  rmSync(probe, { recursive: true, force: true });
}

console.log("Profiles service module contract passed.");
