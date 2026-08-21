import assert from "node:assert/strict";

import {
  PAGE_SNAPSHOT_VERSION,
  captureSnapshot,
  cleanupExpiredSnapshots,
  configurePageSnapshotCore,
  createPageSnapshotKey,
  isSnapshotCompatible,
  pauseSnapshot,
  restoreSnapshot,
  resumeSnapshot,
  saveSnapshot,
  stableSerializeSnapshotValue,
  type PageSnapshotRecord,
} from "../index";

function createMemoryStorage() {
  const records = new Map<string, unknown>();
  return {
    storage: {
      async get<T>(key: string) {
        return records.get(key) as T | undefined;
      },
      async set<T>(key: string, value: T) {
        records.set(key, value);
      },
      async delete(key: string) {
        records.delete(key);
      },
      async clear() {
        records.clear();
      },
      async getAll<T>() {
        return Array.from(records.entries()).map(([key, value]) => ({
          key,
          value: value as T,
        }));
      },
    },
    records,
  };
}

function runKeyTest() {
  const first = createPageSnapshotKey({
    userId: "u1",
    route: "/search",
    pathname: "/search",
    query: { b: "2", a: "1" },
  });
  const second = createPageSnapshotKey({
    userId: "u1",
    route: "/search",
    pathname: "/search",
    query: { a: "1", b: "2" },
  });
  assert.equal(first, second);
  assert.equal(stableSerializeSnapshotValue({ b: 2, a: 1 }), '{"a":1,"b":2}');
  console.log("✅ page-snapshot-core key test passed");
}

async function runStorageTest() {
  const memory = createMemoryStorage();
  configurePageSnapshotCore({ appBuildId: "build-1", storage: memory.storage });
  const saved = await saveSnapshot({
    userId: "u1",
    route: "/profile",
    pathname: "/profile",
    partial: { componentState: { tab: "products" } },
  });
  assert(saved);
  assert.equal(saved.snapshotVersion, PAGE_SNAPSHOT_VERSION);
  const restored = await restoreSnapshot({
    userId: "u1",
    route: "/profile",
    pathname: "/profile",
  });
  assert.equal(restored?.componentState.tab, "products");
  console.log("✅ page-snapshot-core storage test passed");
}

async function runCompatibilityTest() {
  const memory = createMemoryStorage();
  configurePageSnapshotCore({ appBuildId: "build-1", storage: memory.storage });
  const expired = captureSnapshot({
    userId: "u1",
    route: "/old",
    pathname: "/old",
    ttlMs: -1,
  }) as PageSnapshotRecord;
  await memory.storage.set(expired.key, expired);
  assert.equal(isSnapshotCompatible(expired), false);
  assert.equal(await cleanupExpiredSnapshots(), 1);
  assert.equal(memory.records.size, 0);
  console.log("✅ page-snapshot-core compatibility test passed");
}

function runPauseTest() {
  const memory = createMemoryStorage();
  configurePageSnapshotCore({ appBuildId: "build-1", storage: memory.storage });
  pauseSnapshot();
  assert.equal(
    captureSnapshot({ userId: "u1", route: "/x", pathname: "/x" }),
    null,
  );
  resumeSnapshot();
  assert(captureSnapshot({ userId: "u1", route: "/x", pathname: "/x" }));
  console.log("✅ page-snapshot-core pause test passed");
}

async function main() {
  console.log("🚀 Running @asol/page-snapshot-core test suite...\n");
  runKeyTest();
  await runStorageTest();
  await runCompatibilityTest();
  runPauseTest();
  console.log("\n🎉 All @asol/page-snapshot-core tests passed successfully!");
}

main().catch((error) => {
  console.error("\n❌ @asol/page-snapshot-core test suite failed:", error);
  process.exit(1);
});
