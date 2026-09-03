import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Guards the orders service module.
 *
 * The service is deployed from `services/orders` alone, and the two backends
 * must never call each other. Three properties keep that true, and none of them
 * survives on convention:
 *
 * 1. Nothing in the folder may import outside it. A stray `../../src` import
 *    passes locally — the files are right there — and fails only on Vercel.
 * 2. The service serves reads only. An order write spans nine shards plus the
 *    profile and product databases — it cannot be split across accounts.
 * 3. `generated/` must be reproducible from `src/`. It is a mirror, not a fork.
 */

const root = process.cwd();
const serviceRoot = path.join(root, "services", "orders");
const generatedRoot = path.join(serviceRoot, "generated", "src");

function filesBelow(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? filesBelow(target) : [target];
  });
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
          "Only services/orders is uploaded, so the build would fail on Vercel.",
      );
    }
  }
}

// ── 2. Read-only: no write handlers may be served here ───────────────────────

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

for (const file of filesBelow(path.join(serviceRoot, "src", "app", "api"))) {
  if (!file.endsWith("route.ts")) continue;
  const code = stripComments(readFileSync(file, "utf8"));
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.doesNotMatch(
      code,
      new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`),
      `${path.relative(root, file)} exports ${method}. The orders service is read-only: ` +
        "order writes span nine shards plus the profile and product databases.",
    );
  }
}

// ── 3. The order detail route must NOT live here ─────────────────────────────

assert.ok(
  !existsSync(path.join(serviceRoot, "src", "app", "api", "orders", "[orderId]")),
  "GET /api/orders/:orderId enriches the order with profile contacts and store " +
    "details, which this account cannot read. It belongs to the main app.",
);

// ── 4. The bridge must not redirect anything but reads ───────────────────────

const bridge = readFileSync(
  path.join(root, "packages", "account-bridge", "src", "index.ts"),
  "utf8",
);
assert.match(
  stripComments(bridge),
  /resolveRouteOwner\(method, pathOf\(route\)\)/,
  "The bridge must take ownership from the canonical registry. It used to redirect GET only, " +
    "which was a safe approximation while every write stayed on the main app; now writes have " +
    "their own owners and a hardcoded method rule would send them to the wrong one.",
);
assert.match(
  stripComments(bridge),
  /isBrowser\(\)/,
  "The service bridge must be browser-only: server-side redirection would make the two backends call each other.",
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
  "generated/src is empty — run `npx tsx scripts/sync-service-sources.ts orders` first.",
);

const probe = mkdtempSync(path.join(tmpdir(), "asol-orders-sync-"));
try {
  execFileSync(
    process.execPath,
    [path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), "scripts/sync-service-sources.ts", "orders", "--out", probe],
    { cwd: root, stdio: "pipe", shell: false },
  );
  assert.equal(
    committed,
    fingerprint(path.join(probe, "src")),
    "services/orders/generated is stale. Run " +
      "`npx tsx scripts/sync-service-sources.ts orders` and redeploy.",
  );
} finally {
  rmSync(probe, { recursive: true, force: true });
}

console.log("Orders service module contract passed.");
