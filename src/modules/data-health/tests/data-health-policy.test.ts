import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import {
  DATABASE_SHARD_NAMES,
  MARKETPLACE_ORDER_SHARD_DATABASE_NAMES,
  PROFILE_SHARD_DATABASE_NAMES,
  sqliteFileNameForShard,
} from "@/core/database/database-shards";
import {
  cleanupConfirmationText,
  isOlderThan,
  makeIssue,
  stableHash,
} from "../domain/policy";
import { DATA_HEALTH_METADATA_STATEMENTS } from "../db/metadata-schema";
import { DATA_HEALTH_IMAGE_SOURCES } from "../domain/source-registry";

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
  readFileSync(path.join(root, "src/config/storage-profiles.json"), "utf8"),
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
  "Only product images may use the legacy product R2 provider",
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
for (const [databaseName, fileName] of Object.entries(sqliteFiles)) {
  const db = new Database(
    path.join(root, "public/sync_data/sync_sqlite", fileName),
    { readonly: true },
  );
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
    path.join(root, "public/catagory/pharmacy/active_ingredients.json"),
    "utf8",
  ),
) as Array<{ id: number; image_url?: string }>;
for (const item of pharmacyItems) {
  if (!item.image_url) continue;
  assert.ok(
    existsSync(path.join(root, "public", item.image_url)),
    `Missing pharmacy static image ${item.id}: ${item.image_url}`,
  );
}

console.log("Data health policy and metadata contracts passed.");
