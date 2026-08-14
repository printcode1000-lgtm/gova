import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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

// ── 3. Routes that read beyond the profile shards must NOT live here ─────────

for (const absent of ["reviews", "store-images", "discounts", "editor"]) {
  assert.ok(
    !existsSync(path.join(serviceRoot, "src", "app", "api", "profile", absent)),
    `/api/profile/${absent} reads or writes beyond the profile shards — reviews and ` +
      "discounts touch the product database, store-images and editor go through " +
      "image storage. They belong to the main app.",
  );
}

// ── 4. The bridge must not redirect anything but browser reads ───────────────

const bridge = stripComments(
  readFileSync(
    path.join(root, "src", "modules", "service-bridge", "service-bridge.client.ts"),
    "utf8",
  ),
);
assert.match(
  bridge,
  /method\.toUpperCase\(\)\s*!==\s*["']GET["']/,
  "The service bridge must redirect GET only; a redirected write would reach an account that cannot serve it.",
);
assert.match(
  bridge,
  /isBrowser\(\)/,
  "The service bridge must be browser-only: server-side redirection would make the deployments call each other.",
);
assert.doesNotMatch(
  bridge,
  /"\/api\/profile\/reviews"/,
  "/api/profile/reviews reads the product database too. It must not be routed to the profiles account.",
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
