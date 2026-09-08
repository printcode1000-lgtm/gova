import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import * as browserApi from "../index";
import * as serverApi from "../server";
import {
  assertLocalDevelopmentAllowed,
  assertStrictLocalDevelopmentAllowed,
  buildLocalDevelopmentEnvironment,
  isLocalDevelopmentRuntime,
  isStrictLocalDevelopmentRuntime,
} from "../guards/development-guard";

function getTsSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "tests") {
        results.push(...getTsSourceFiles(full));
      }
    } else if (entry.isFile() && /\.ts$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

export function runGuardsTest() {
  const allowed = {
    isDevelopment: true,
    deployment: "local-development",
    nodeEnv: "development",
    publicMode: "development",
    vercel: false,
    nextPhase: undefined,
  } as const;

  assert.equal(isLocalDevelopmentRuntime(allowed), true);
  assert.equal(isStrictLocalDevelopmentRuntime(allowed), true);
  assert.equal(buildLocalDevelopmentEnvironment(allowed).allowed, true);

  assert.throws(
    () => assertLocalDevelopmentAllowed({ ...allowed, isDevelopment: false }, "blocked"),
    /blocked/,
  );

  assert.throws(
    () =>
      assertStrictLocalDevelopmentAllowed(
        { ...allowed, vercel: true },
        "strictBlocked",
      ),
    /strictBlocked/,
  );

  console.log("✅ dev-core guards test passed");
}

export function runPublicSurfaceTest() {
  assert.equal(typeof browserApi.isLocalDevelopmentRuntime, "function");
  assert.equal(typeof browserApi.isStrictLocalDevelopmentRuntime, "function");
  assert.equal(typeof browserApi.assertLocalDevelopmentAllowed, "function");
  assert.equal(typeof serverApi.readLocalDevelopmentRuntimeFromProcess, "function");
  console.log("✅ dev-core public surface test passed");
}

/**
 * The package owns a Development guard and nothing else.
 *
 * It used to own local persistence as well: SQLite filenames, the
 * `public/sync_data` segments, the shard-file naming rule, and the URL a locally
 * stored image was served from. Server data is Turso and image objects are R2 in
 * every runtime now, so any of those names reappearing here would mean a second
 * storage backend is being reintroduced under a "development tooling" heading —
 * which is exactly how the first one stayed invisible.
 */
export function runNoLocalPersistenceOwnershipTest() {
  const files = getTsSourceFiles(path.join(process.cwd(), "packages", "dev-core", "src"));
  const forbidden = [
    "sync_sqlite",
    "sync_file",
    "allusers.db",
    "sqliteFileNameForShard",
    "resolveSqliteDirectory",
    "resolveLocalImagesRoot",
    "buildLocalSyncFilePublicUrl",
    "SCHEMA_SYNC_REPORT",
  ];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const token of forbidden) {
      assert.ok(
        !content.includes(token),
        `dev-core must not own local persistence: ${path.relative(process.cwd(), file)} mentions ${token}`,
      );
    }
  }
  console.log("✅ dev-core no-local-persistence test passed");
}

export function runRuntimePurityTest() {
  const browserFiles = getTsSourceFiles(path.join(process.cwd(), "packages", "dev-core", "src"));
  const forbidden = ["node:fs", "node:child_process", "better-sqlite3", "server-only"];
  for (const file of browserFiles) {
    if (file.endsWith("server.ts")) continue;
    const content = readFileSync(file, "utf8");
    for (const token of forbidden) {
      assert.ok(
        !content.includes(token),
        `Browser door purity violation in ${path.relative(process.cwd(), file)}: ${token}`,
      );
    }
  }
  console.log("✅ dev-core runtime purity test passed");
}

export function runPackageIndependenceTest() {
  const root = process.cwd();
  const devCoreFiles = getTsSourceFiles(path.join(root, "packages", "dev-core", "src"));
  const forbiddenPackages = ["@asol/", "@/", "next/", "drizzle-orm"];
  for (const file of devCoreFiles) {
    const content = readFileSync(file, "utf8");
    for (const token of forbiddenPackages) {
      assert.ok(
        !content.includes(token),
        `Package independence violation in ${path.relative(root, file)}: ${token}`,
      );
    }
  }
  console.log("✅ dev-core package independence test passed");
}

async function main() {
  console.log("🚀 Running @asol/dev-core test suite...\n");
  runGuardsTest();
  runPublicSurfaceTest();
  runNoLocalPersistenceOwnershipTest();
  runRuntimePurityTest();
  runPackageIndependenceTest();
  console.log("\n✅ @asol/dev-core: all tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
