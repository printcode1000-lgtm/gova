import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import * as browserApi from "../index";
import * as serverApi from "../server";
import {
  LOCAL_RUNTIME_SQLITE_FILES,
  PRIMARY_SQLITE_FILE,
} from "../domain/database-files";
import {
  LOCAL_SQLITE_SEGMENT,
  LOCAL_SYNC_FILE_PUBLIC_PREFIX,
} from "../domain/paths";
import { buildLocalSyncFilePublicUrl } from "../domain/public-url";
import { sqliteFileNameForShard } from "../domain/shards";
import {
  assertLocalDevelopmentAllowed,
  assertStrictLocalDevelopmentAllowed,
  buildLocalDevelopmentEnvironment,
  isLocalDevelopmentRuntime,
  isStrictLocalDevelopmentRuntime,
} from "../guards/development-guard";
import {
  resolvePrimarySqlitePath,
  resolveSqliteDirectory,
  resolveSyncFileRoot,
} from "../server";

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

export function runPathsTest() {
  const cwd = path.join(process.cwd(), "packages", "dev-core");
  assert.equal(resolveSqliteDirectory(cwd), path.join(cwd, LOCAL_SQLITE_SEGMENT));
  assert.equal(
    resolvePrimarySqlitePath(cwd),
    path.join(cwd, LOCAL_SQLITE_SEGMENT, PRIMARY_SQLITE_FILE),
  );
  assert.equal(
    resolveSyncFileRoot(cwd),
    path.join(cwd, "public", "sync_data", "sync_file"),
  );
  assert.equal(
    buildLocalSyncFilePublicUrl("images/avatars/test.webp"),
    `${LOCAL_SYNC_FILE_PUBLIC_PREFIX}/images/avatars/test.webp`,
  );
  assert.equal(sqliteFileNameForShard("profile-core"), "profile-core.db");
  console.log("✅ dev-core paths test passed");
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
  assert.equal(typeof browserApi.buildLocalSyncFilePublicUrl, "function");
  assert.equal(browserApi.LOCAL_RUNTIME_SQLITE_FILES.primary, "allusers.db");
  assert.equal(typeof serverApi.resolveSqliteDirectory, "function");
  assert.equal(typeof serverApi.readLocalDevelopmentRuntimeFromProcess, "function");
  console.log("✅ dev-core public surface test passed");
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
  runPathsTest();
  runGuardsTest();
  runPublicSurfaceTest();
  runRuntimePurityTest();
  runPackageIndependenceTest();
  console.log("\n✅ @asol/dev-core: all tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
