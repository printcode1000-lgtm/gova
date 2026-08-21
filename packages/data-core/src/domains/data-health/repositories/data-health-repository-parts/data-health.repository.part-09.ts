import { advertisementsDataSource, productsDataSource, profilesDataSource, usersDataSource } from "../../../../core";
import "server-only";
import { randomUUID } from "node:crypto";
import {
  DATABASE_SHARDS,
  DATABASE_SHARD_NAMES,
  DATABASE_SHARD_TABLE_TO_DATABASE,
  MARKETPLACE_ORDER_TABLE_TO_DATABASE,
} from "../../../../core/database/database-shards";
import { ShardedRawDatabaseClient } from "../../../../core/database/sharded-raw-database-client";
import { getAllStorageProfiles } from "@asol/storage-core/server";
import { storageFolderCandidates } from "@asol/storage-core";
import { createMarketplaceOrdersDb } from "../../../marketplace-orders/db/client";
import {
  DATA_HEALTH_POLICY,
  isOlderThan,
  makeIssue,
  quarantineResourceType,
  severityRank,
} from "@asol/data-health-core/server";
import { resolveDataHealthExecutionContext } from "../../runtime-context.server";
import { DATA_HEALTH_IMAGE_SOURCES } from "@asol/data-health-core";
import type {
  DataHealthAuditEntry,
  DataHealthCleanupAction,
  DataHealthCleanupResult,
  DataHealthHistoryEntry,
  DataHealthIssue,
  DataHealthQuarantineEntry,
  DataHealthReport,
  DataHealthTopology,
} from "@asol/data-health-core";
import { DATA_HEALTH_METADATA_STATEMENTS } from "../../db/metadata-schema";
import { storageInventoryRepository } from "../storage-inventory.repository.server";
import { DataHealthPart8 } from "./data-health.repository.part-08";
type Row = Record<string, unknown>;
export interface QuarantinedOriginalCleanupResult {
  deletedRecords: number;
  storageObjects: Array<{ storageProfileId: string; imageKey: string }>;
}
interface ScanContext {
  users: Set<string>;
  products: Set<string>;
  profiles: Set<string>;
  orders: Set<string>;
  sellerOrders: Set<string>;
  customItems: Set<string>;
}
function text(value: unknown): string {
  return String(value ?? "").trim();
}
function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function parseJson(value: unknown): unknown {
  try {
    return JSON.parse(text(value) || "null") as unknown;
  } catch {
    return null;
  }
}
function jsonStringArray(value: unknown): string[] | null {
  const parsed = parseJson(value);
  if (Array.isArray(parsed)) {
    return parsed.filter((item): item is string => typeof item === "string");
  }
  if (parsed && typeof parsed === "object") {
    const productIds = (parsed as Record<string, unknown>).productIds;
    if (Array.isArray(productIds)) {
      return productIds.filter(
        (item): item is string => typeof item === "string",
      );
    }
  }
  return null;
}
function realRows(rows: Row[]): Row[] {
  return rows.filter((row) => text(row.id));
}
function routeFor(database: string, table: string, recordId: string): string {
  if (table === "products")
    return `/product?mode=view&id=${encodeURIComponent(recordId)}`;
  if (table === "user_profiles") {
    return `/profile?mode=preview&uid=${encodeURIComponent(recordId)}`;
  }
  if (database.startsWith("orders-")) {
    return `/orders/${encodeURIComponent(recordId)}`;
  }
  return "";
}
function orderShardFor(table: string): string {
  return (
    MARKETPLACE_ORDER_TABLE_TO_DATABASE[
      table as keyof typeof MARKETPLACE_ORDER_TABLE_TO_DATABASE
    ] ?? "orders-core"
  );
}
function resultChanged(rows: Row[]): boolean {
  if (rows.length === 0) return false;
  const row = rows[0];
  return Boolean(
    text(row.id) ||
    numberValue(row.changes) > 0 ||
    numberValue(row.rowsAffected) > 0,
  );
}

export abstract class DataHealthPart9 extends DataHealthPart8 {
  protected async collectOrderRelationIssues(
    issues: DataHealthIssue[],
    context: ScanContext,
  ): Promise<number> {
    const db = createMarketplaceOrdersDb();
    const [
      itemRows,
      imageRows,
      shipmentRows,
      paymentRows,
      returnRows,
      replacementRows,
    ] = await Promise.all([
      db.execute(
        "SELECT id, order_id, seller_order_id, seller_id, product_id, product_name_snapshot, product_image_snapshot, created_at, updated_at FROM order_items",
      ),
      db.execute(
        "SELECT id, custom_request_item_id, order_id, uploaded_by, storage_profile_id, image_key, created_at, updated_at FROM custom_request_images",
      ),
      db.execute(
        "SELECT id, order_id, carrier_id, created_at, updated_at FROM shipments",
      ),
      db.execute(
        "SELECT id, order_id, buyer_id, status, created_at, updated_at FROM payments",
      ),
      db.execute(
        "SELECT id, order_id, buyer_id, carrier_id, status, created_at, updated_at FROM return_requests",
      ),
      db.execute(
        "SELECT id, order_id, buyer_id, status, created_at, updated_at FROM replacement_requests",
      ),
    ]);
    const items = realRows(itemRows);
    const images = realRows(imageRows);
    const shipments = realRows(shipmentRows);
    const payments = realRows(paymentRows);
    const returns = realRows(returnRows);
    const replacements = realRows(replacementRows);
    for (const row of items) {
      const baseBroken =
        !context.orders.has(text(row.order_id)) ||
        !context.sellerOrders.has(text(row.seller_order_id)) ||
        !context.users.has(text(row.seller_id));
      const historicalSnapshotBroken =
        !context.products.has(text(row.product_id)) &&
        !text(row.product_name_snapshot) &&
        !text(row.product_image_snapshot);
      if (baseBroken || historicalSnapshotBroken) {
        issues.push(
          makeIssue({
            category: "order",
            severity: baseBroken ? "critical" : "warning",
            database: "orders-items",
            table: "order_items",
            recordId: text(row.id),
            ownerUid: text(row.seller_id),
            title: baseBroken
              ? "عنصر طلب مرتبط بطلب أو بائع غير موجود"
              : "منتج الطلب غير موجود ولقطته التاريخية ناقصة",
            details: `order=${text(row.order_id)}, sellerOrder=${text(row.seller_order_id)}, product=${text(row.product_id)}`,
            evidence: { ...row },
            cleanupAction: "none",
            cleanupMode: "protected",
            createdAt: text(row.created_at),
            updatedAt: text(row.updated_at),
          }),
        );
      }
    }
    for (const row of images) {
      if (
        !context.customItems.has(text(row.custom_request_item_id)) ||
        !context.orders.has(text(row.order_id)) ||
        !context.users.has(text(row.uploaded_by)) ||
        !text(row.image_key)
      ) {
        issues.push(
          makeIssue({
            category: "image",
            severity: "critical",
            database: "orders-items",
            table: "custom_request_images",
            recordId: text(row.id),
            ownerUid: text(row.uploaded_by),
            title: "صورة طلب مخصص بلا مالك أو طلب صالح",
            details: `item=${text(row.custom_request_item_id)}, order=${text(row.order_id)}, uploader=${text(row.uploaded_by)}`,
            evidence: { ...row },
            cleanupAction: "quarantine-record",
            cleanupMode: "quarantine",
            relatedId: text(row.image_key),
            createdAt: text(row.created_at),
            updatedAt: text(row.updated_at),
          }),
        );
      }
    }
    for (const row of shipments) {
      if (
        !context.orders.has(text(row.order_id)) ||
        (text(row.carrier_id) && !context.users.has(text(row.carrier_id)))
      ) {
        this.pushProtectedOrderRelation(
          issues,
          "shipments",
          row,
          text(row.carrier_id),
        );
      }
    }
    for (const row of payments) {
      if (
        !context.orders.has(text(row.order_id)) ||
        !context.users.has(text(row.buyer_id))
      ) {
        this.pushProtectedOrderRelation(
          issues,
          "payments",
          row,
          text(row.buyer_id),
        );
      }
    }
    for (const row of [...returns, ...replacements]) {
      if (
        !context.orders.has(text(row.order_id)) ||
        !context.users.has(text(row.buyer_id)) ||
        (text(row.carrier_id) && !context.users.has(text(row.carrier_id)))
      ) {
        this.pushProtectedOrderRelation(
          issues,
          returns.includes(row) ? "return_requests" : "replacement_requests",
          row,
          text(row.buyer_id),
        );
      }
    }
    return (
      items.length +
      images.length +
      shipments.length +
      payments.length +
      returns.length +
      replacements.length
    );
  }

  protected async collectAdvertisementIssues(
    issues: DataHealthIssue[],
    context: ScanContext,
  ): Promise<number> {
    const [featured, hero, trending] = await Promise.all([
      advertisementsDataSource.execute(
        "SELECT id, product_ids_json, updated_at FROM featured_marquee",
      ) as Promise<Row[]>,
      advertisementsDataSource.execute(
        "SELECT id, config_json, updated_at FROM hero_slider",
      ) as Promise<Row[]>,
      advertisementsDataSource.execute(
        "SELECT id, config_json, updated_at FROM trending_ribbon",
      ) as Promise<Row[]>,
    ]);
    for (const row of featured) {
      const ids = jsonStringArray(row.product_ids_json);
      if (ids === null) {
        this.pushInvalidAdvertisementJson(issues, "featured_marquee", row);
      } else {
        const missing = ids.filter((id) => !context.products.has(id));
        if (missing.length > 0) {
          issues.push(
            makeIssue({
              category: "advertisement",
              severity: "warning",
              database: "advertisements",
              table: "featured_marquee",
              recordId: text(row.id),
              ownerUid: "",
              title: "الإعلانات المميزة تشير إلى منتجات غير موجودة",
              details: `${missing.length} منتج غير موجود.`,
              evidence: { missingProductIds: missing },
              cleanupAction: "none",
              cleanupMode: "manual",
              updatedAt: text(row.updated_at),
            }),
          );
        }
      }
    }
    for (const row of [...hero, ...trending]) {
      if (parseJson(row.config_json) === null) {
        this.pushInvalidAdvertisementJson(
          issues,
          hero.includes(row) ? "hero_slider" : "trending_ribbon",
          row,
        );
      }
    }
    return featured.length + hero.length + trending.length;
  }
}
