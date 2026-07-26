import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import type { MarketplaceDb } from "@/modules/marketplace-orders/db/client";
import { orderPurgeRepository } from "../repositories/order-purge.repository.server";

const sqlite = new Database(":memory:");
sqlite.pragma("foreign_keys = ON");
sqlite.exec(
  readFileSync(
    path.join(
      process.cwd(),
      "src/modules/marketplace-orders/db/migrations/0000_marketplace_orders.sql",
    ),
    "utf8",
  ),
);

const normalize = (values: unknown[]) =>
  values.map((value) => (typeof value === "boolean" ? (value ? 1 : 0) : value));
const db: MarketplaceDb = {
  async execute(sql, params = []) {
    const statement = sqlite.prepare(sql);
    const args = normalize(params);
    return /^\s*(SELECT|WITH|PRAGMA)/i.test(sql)
      ? (statement.all(...args) as Record<string, unknown>[])
      : [{ changes: statement.run(...args).changes }];
  },
  async transaction(work) {
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const result = await work(db);
      sqlite.exec("COMMIT");
      return result;
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  },
};

async function run() {
  const now = "2026-07-26T00:00:00.000Z";
  await db.execute(
    "INSERT INTO orders (id, order_number, buyer_id, order_type, delivery_address_snapshot_json, currency, calculated_status, created_at, updated_at) VALUES (?, ?, ?, ?, '{}', 'EGP', 'new', ?, ?)",
    ["order-1", "ORD-1", "buyer-1", "custom_request_order", now, now],
  );
  await db.execute(
    "INSERT INTO seller_orders (id, order_id, seller_id, seller_order_type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      "seller-order-1",
      "order-1",
      "seller-1",
      "custom_request",
      "waiting_for_response",
      now,
      now,
    ],
  );
  await db.execute(
    "INSERT INTO custom_request_items (id, order_id, seller_order_id, seller_id, title, buyer_description, request_type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      "custom-1",
      "order-1",
      "seller-order-1",
      "seller-1",
      "Custom",
      "Description",
      "custom_purchase",
      "new",
      now,
      now,
    ],
  );
  await db.execute(
    "INSERT INTO custom_request_images (id, custom_request_item_id, order_id, uploaded_by, storage_profile_id, image_url, image_key, file_size, mime_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      "image-1",
      "custom-1",
      "order-1",
      "buyer-1",
      "spicialOrder",
      "/image.webp",
      "image.webp",
      100,
      "image/webp",
      now,
      now,
    ],
  );

  const snapshot = await orderPurgeRepository.snapshot(db);
  assert.equal(snapshot.orderCount, 1);
  assert.equal(snapshot.images.length, 1);
  assert.equal(snapshot.tableCounts.custom_request_images, 1);
  assert.ok(snapshot.ownedTables.includes("custom_request_images"));

  const deleted = await orderPurgeRepository.deleteAll(snapshot, db);
  assert.equal(deleted.orders, 1);
  for (const table of [
    "orders",
    "seller_orders",
    "custom_request_items",
    "custom_request_images",
  ]) {
    const rows = await db.execute(`SELECT COUNT(*) AS count FROM "${table}"`);
    assert.equal(Number(rows[0]?.count), 0, `${table} must be empty`);
  }

  sqlite.close();
  console.log("Data health order purge integration passed.");
}

run().catch((error) => {
  sqlite.close();
  console.error(error);
  process.exitCode = 1;
});
