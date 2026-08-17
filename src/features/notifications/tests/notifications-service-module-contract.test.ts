import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Guards the notifications service module.
 *
 * The service is deployed from `services/notifications` alone. Two properties
 * keep that safe, and neither is obvious enough to survive on convention:
 *
 * 1. Nothing in the folder may import outside it. A stray `../../src` import
 *    passes locally — the files are right there — and fails only on Vercel,
 *    where the upload contains just this folder.
 * 2. `generated/` must be reproducible from `src/`. It is a mirror, not a fork:
 *    if it can drift, the two deployments can build different notification
 *    payloads from the same template.
 */

const root = process.cwd();
const serviceRoot = path.join(root, "services", "notifications");
const generatedRoot = path.join(serviceRoot, "generated", "src");

function filesBelow(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? filesBelow(target) : [target];
  });
}

// ── 1. The module's own source must be self-contained ────────────────────────

const ownSourceDirectories = [
  path.join(serviceRoot, "src"),
  path.join(serviceRoot, "stubs"),
];

const specifierPattern = /\bfrom\s+['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const directory of ownSourceDirectories) {
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
          "Only services/notifications is uploaded, so the build would fail on Vercel.",
      );
    }
  }
}

// ── 2. The service must not reach the main app's databases ───────────────────

const sendRoute = readFileSync(
  path.join(serviceRoot, "src", "app", "api", "notifications", "send", "route.ts"),
  "utf8",
);

/** Comments discuss the forwarding method by name; only real calls matter. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * The route owns HTTP; delivery lives behind the service-runtime entry point.
 *
 * The rule has not changed — this deployment must call the local sender, never the
 * forwarding one, and may reach exactly one notification path. What changed is where the
 * rule is enforced. The route now goes through layer 2
 * (`@asol/notifications-composition`), which is the only module that imports
 * `service-runtime` and which re-exports exactly three named things. The route therefore
 * cannot widen its surface by adding an import: there is nothing else to import from.
 *
 * So the assertion moved down a level rather than being relaxed. The route must reach
 * **no** notification path directly, and the composition must reach exactly one.
 */
const sendRouteCode = stripComments(sendRoute);
assert.match(
  sendRouteCode,
  /from\s+['"]@asol\/notifications-composition['"]/,
  "The service route must go through @asol/notifications-composition (layer 2).",
);
assert.doesNotMatch(
  sendRouteCode,
  /@\/features\/notifications\//,
  "The service route must not reach a notification path directly: that is layer 2's job.",
);

const compositionCode = stripComments(
  readFileSync(
    path.join(root, "packages", "notifications-composition", "src", "index.ts"),
    "utf8",
  ),
);
assert.match(
  compositionCode,
  /from\s+['"]@asol\/notifications-core\/server['"]/,
  "The composition must import @asol/notifications-core/server.",
);
assert.doesNotMatch(
  compositionCode,
  /@\/features\/notifications\//,
  "The composition must not reach the application's notifications feature. The delivery " +
    "core is a sealed package now, and its import surface is this deployment's file surface.",
);

const serviceRuntime = stripComments(
  readFileSync(
    path.join(root, "packages", "notifications-core", "src", "service-runtime.ts"),
    "utf8",
  ),
);
assert.match(
  serviceRuntime,
  /sendToUsersLocally\s*\(/,
  "The service runtime must call sendToUsersLocally; sendToUsers would forward to itself.",
);
for (const [label, code] of [
  ["route", sendRouteCode],
  ["service runtime", serviceRuntime],
] as const) {
  assert.doesNotMatch(
    code,
    /\bsendToUsers\s*\(/,
    `The ${label} must never call sendToUsers: that is the forwarding entry point.`,
  );
}

// ── 3. The main app must own no fan-out route ────────────────────────────────

assert.ok(
  !existsSync(path.join(root, "src", "app", "api", "notifications", "send")),
  "The main app must not serve /api/notifications/send: fan-out belongs to the notifications service alone.",
);

// ── 4. generated/ must be reproducible from src/ ─────────────────────────────

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
  "generated/src is empty — run `npx tsx scripts/sync-notifications-service-sources.ts` first.",
);

// Mirror into a throwaway directory rather than over the real one: a check that
// repairs the drift it is looking for would only ever fail once.
const probe = mkdtempSync(path.join(tmpdir(), "asol-notifications-sync-"));
try {
  execFileSync(
    process.execPath,
    [path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), "scripts/sync-notifications-service-sources.ts", "--out", probe],
    { cwd: root, stdio: "pipe", shell: false },
  );

  assert.equal(
    committed,
    fingerprint(path.join(probe, "src")),
    "services/notifications/generated is stale. Run " +
      "`npx tsx scripts/sync-notifications-service-sources.ts` and redeploy: " +
      "the mirror no longer matches src/.",
  );
} finally {
  rmSync(probe, { recursive: true, force: true });
}

console.log("Notifications service module contract passed.");
