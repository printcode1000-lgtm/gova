import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import {
  DATABASE_SHARD_NAMES,
  MARKETPLACE_ORDER_SHARD_DATABASE_NAMES,
  PROFILE_SHARD_DATABASE_NAMES,
  sqliteFileNameForShard,
} from "../../../core/database/database-shards";
import {
  cleanupConfirmationText,
  isOlderThan,
  makeIssue,
  quarantineResourceType,
  stableHash,
} from "@asol/data-health-core/server";
import { DATA_HEALTH_METADATA_STATEMENTS } from "../db/metadata-schema";
import { DATA_HEALTH_IMAGE_SOURCES } from "../db/image-source-registry";

const base = {
  category: "image" as const,
  severity: "warning" as const,
  database: "storage",
  table: "objects",
  recordId: "images/products/example.webp",
  ownerUid: "",
  title: "orphan",
  details: "orphan image",
  evidence: { imageKey: "example.webp" },
  cleanupAction: "quarantine-storage-object" as const,
  cleanupMode: "quarantine" as const,
};

const first = makeIssue(base);
const second = makeIssue({ ...base, title: "translated title" });
assert.equal(first.fingerprint, second.fingerprint);
assert.equal(first.snapshotHash, second.snapshotHash);
assert.equal(first.canClean, true);
assert.equal(quarantineResourceType("quarantine-record"), "record");
assert.equal(quarantineResourceType("quarantine-storage-object"), "image");

const protectedIssue = makeIssue({
  ...base,
  cleanupAction: "none",
  cleanupMode: "protected",
});
assert.equal(protectedIssue.canClean, false);

assert.equal(cleanupConfirmationText("development", 3), "تنظيف 3 عنصر");
assert.equal(
  cleanupConfirmationText("production", 3),
  "تنظيف 3 عنصر في الإنتاج",
);
assert.equal(
  isOlderThan("2026-01-01T00:00:00.000Z", 90, Date.parse("2026-07-01")),
  true,
);
assert.equal(
  isOlderThan("2026-06-30T00:00:00.000Z", 90, Date.parse("2026-07-01")),
  false,
);
assert.equal(stableHash({ a: 1 }), stableHash({ a: 1 }));

assert.ok(DATA_HEALTH_METADATA_STATEMENTS.length >= 10);
assert.ok(
  DATA_HEALTH_METADATA_STATEMENTS.every((statement) =>
    /CREATE (TABLE|INDEX) IF NOT EXISTS/i.test(statement),
  ),
);

const root = process.cwd();
const storageProfiles = JSON.parse(
  readFileSync(path.join(root, "packages/storage-core/src/config/storage-profiles.json"), "utf8"),
) as {
  profiles: Array<{
    id: string;
    enabled: boolean;
    provider: string;
    folder: string;
    cloudFolder?: string;
  }>;
};
const enabledProfileIds = new Set(
  storageProfiles.profiles
    .filter((profile) => profile.enabled)
    .map((profile) => profile.id),
);
assert.equal(DATABASE_SHARD_NAMES.length, 17);
assert.equal(PROFILE_SHARD_DATABASE_NAMES.length, 8);
assert.equal(MARKETPLACE_ORDER_SHARD_DATABASE_NAMES.length, 9);
assert.ok(DATABASE_SHARD_NAMES.includes("system-ops"));
assert.ok(DATABASE_SHARD_NAMES.includes("orders-disputes-audit"));
for (const profile of storageProfiles.profiles.filter(
  (candidate) => candidate.enabled,
)) {
  assert.match(profile.folder, /^images\//);
  if (profile.id === "product-default") {
    assert.equal(
      profile.provider,
      "CloudflareR2Products",
      "Product images must stay on the legacy product R2 provider",
    );
    assert.equal(profile.cloudFolder ?? profile.folder, "images/products");
  } else if (profile.id === "product-apparel-pets") {
    assert.equal(
      profile.provider,
      "CloudflareR2_products-apparel-pets",
      "Apparel/pets product images must use the dedicated apparel-pets R2 provider",
    );
    assert.equal(
      profile.cloudFolder ?? profile.folder,
      "images/products-apparel-pets",
    );
  } else {
    assert.equal(
      profile.provider,
      "CloudflareR2",
      `Cloud storage profile ${profile.id} must use CloudflareR2`,
    );
    assert.match(
      profile.cloudFolder ?? profile.folder,
      /^images\/(profile|content)\//,
    );
  }
}
assert.deepEqual(
  storageProfiles.profiles
    .filter(
      (profile) =>
        profile.enabled && profile.provider === "CloudflareR2Products",
    )
    .map((profile) => profile.id),
  ["product-default"],
  "Only legacy product images may use the legacy product R2 provider",
);
assert.deepEqual(
  storageProfiles.profiles
    .filter(
      (profile) =>
        profile.enabled &&
        profile.provider === "CloudflareR2_products-apparel-pets",
    )
    .map((profile) => profile.id),
  ["product-apparel-pets"],
  "Exactly one profile may use the apparel-pets product R2 provider",
);
assert.equal(
  storageProfiles.profiles.filter(
    (profile) => profile.enabled && profile.provider === "CloudflareR2",
  ).length,
  4,
  "The primary R2 provider must own the four non-product image profiles",
);
for (const source of DATA_HEALTH_IMAGE_SOURCES) {
  if (source.defaultStorageProfileId) {
    assert.ok(
      enabledProfileIds.has(source.defaultStorageProfileId),
      `Image source ${source.database}.${source.table} uses an unknown storage profile`,
    );
  }
}

const registeredColumns = new Set(
  DATA_HEALTH_IMAGE_SOURCES.flatMap((source) =>
    source.columns.map(
      (column) => `${source.database}.${source.table}.${column}`,
    ),
  ),
);
const sqliteFiles = {
  product: "product.db",
  advertisements: "advertisements.db",
  ...Object.fromEntries(
    DATABASE_SHARD_NAMES.map((databaseName) => [
      databaseName,
      sqliteFileNameForShard(databaseName),
    ]),
  ),
} as const;
const unregisteredImageColumns: string[] = [];
/**
 * A shard file that is not on disk yet is skipped, not a failure.
 *
 * Most shards are tracked, but `system-ops.db` is gitignored on purpose — local
 * runtime state, untracked since `054ffbe` — and `db:ensure` creates it. That
 * script runs *after* the test suite in both `build` and `deploy:all`, so a
 * fresh clone opened this file before anything had created it and the whole
 * suite died on `SQLITE_CANTOPEN`, on a machine where nothing was actually
 * wrong.
 *
 * Skipping cannot hide column drift: a shard absent from disk has no columns to
 * drift, and the skipped names are printed so a shard that vanishes
 * unexpectedly is still visible rather than silently unscanned.
 */
const skippedShards: string[] = [];
for (const [databaseName, fileName] of Object.entries(sqliteFiles)) {
  const filePath = path.join(root, "public/sync_data/sync_sqlite", fileName);
  if (!existsSync(filePath)) {
    skippedShards.push(fileName);
    continue;
  }
  const db = new Database(filePath, { readonly: true });
  try {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as Array<{ name: string }>;
    for (const table of tables) {
      const columns = db
        .prepare(`PRAGMA table_info("${table.name.replace(/"/g, '""')}")`)
        .all() as Array<{ name: string }>;
      for (const column of columns) {
        if (
          !/(?:^|_)(?:image|avatar|cover|photo|logo|media)(?:_|$)/i.test(
            column.name,
          )
        ) {
          continue;
        }
        const identity = `${databaseName}.${table.name}.${column.name}`;
        if (!registeredColumns.has(identity)) {
          unregisteredImageColumns.push(identity);
        }
      }
    }
  } finally {
    db.close();
  }
}
assert.deepEqual(
  unregisteredImageColumns,
  [],
  `Persisted image fields are not registered:\n${unregisteredImageColumns.join("\n")}`,
);

const pharmacyItems = JSON.parse(
  readFileSync(
    path.join(root, "public/catagory/pharmacy/ingredients.json"),
    "utf8",
  ),
) as { schemaVersion: 3; items: Array<{ id: number; imagePath?: string }> };
for (const item of pharmacyItems.items) {
  if (!item.imagePath) continue;
  assert.ok(
    existsSync(path.join(root, "public", item.imagePath.replace(/^\/+/, ""))),
    `Missing pharmacy static image ${item.id}: ${item.imagePath}`,
  );
}

if (skippedShards.length > 0) {
  console.log(
    `Data health policy: skipped ${skippedShards.length} shard file(s) not on disk (run db:ensure to create them): ${skippedShards.join(", ")}`,
  );
}

console.log("Data health policy and metadata contracts passed.");
