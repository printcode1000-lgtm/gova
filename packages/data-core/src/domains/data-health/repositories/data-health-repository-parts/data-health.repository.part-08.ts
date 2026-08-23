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
import { DataHealthPart7 } from "./data-health.repository.part-07";
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

export abstract class DataHealthPart8 extends DataHealthPart7 {
  protected async collectProductRelationIssues(
    issues: DataHealthIssue[],
    context: ScanContext,
  ): Promise<number> {
    const [reviews, helpful, replies, overrides] = await Promise.all([
      productsDataSource.execute(
        "SELECT id, product_id, uid, created_at, updated_at FROM product_reviews",
      ) as Promise<Row[]>,
      productsDataSource.execute(
        "SELECT review_id, uid, created_at FROM product_review_helpful",
      ) as Promise<Row[]>,
      productsDataSource.execute(
        "SELECT id, review_id, seller_uid, created_at, updated_at FROM product_review_replies",
      ) as Promise<Row[]>,
      productsDataSource.execute(
        "SELECT id, uid, fixed_product_id, image_key, created_at, updated_at FROM pharmacy_profile_product_overrides",
      ) as Promise<Row[]>,
    ]);
    const reviewIds = new Set(reviews.map((row) => text(row.id)));
    for (const row of reviews) {
      if (
        !context.products.has(text(row.product_id)) ||
        !context.users.has(text(row.uid))
      ) {
        issues.push(
          makeIssue({
            category: "relationship",
            severity: "warning",
            database: "product",
            table: "product_reviews",
            recordId: text(row.id),
            ownerUid: text(row.uid),
            title: "تقييم منتج مرتبط بمنتج أو مستخدم غير موجود",
            details: `product=${text(row.product_id)}, reviewer=${text(row.uid)}`,
            evidence: { ...row },
            cleanupAction: "delete-broken-relation",
            cleanupMode: "automatic",
            createdAt: text(row.created_at),
            updatedAt: text(row.updated_at),
          }),
        );
      }
    }
    for (const row of helpful) {
      if (
        !reviewIds.has(text(row.review_id)) ||
        !context.users.has(text(row.uid))
      ) {
        issues.push(
          makeIssue({
            category: "relationship",
            severity: "warning",
            database: "product",
            table: "product_review_helpful",
            recordId: `${text(row.review_id)}|${text(row.uid)}`,
            ownerUid: text(row.uid),
            title: "تصويت تقييم منتج بلا مرجع صالح",
            details: `review=${text(row.review_id)}, uid=${text(row.uid)}`,
            evidence: { ...row },
            cleanupAction: "delete-broken-relation",
            cleanupMode: "automatic",
            createdAt: text(row.created_at),
          }),
        );
      }
    }
    for (const row of replies) {
      if (
        !reviewIds.has(text(row.review_id)) ||
        !context.users.has(text(row.seller_uid))
      ) {
        issues.push(
          makeIssue({
            category: "relationship",
            severity: "warning",
            database: "product",
            table: "product_review_replies",
            recordId: text(row.id),
            ownerUid: text(row.seller_uid),
            title: "رد تقييم منتج بلا مرجع صالح",
            details: `review=${text(row.review_id)}, seller=${text(row.seller_uid)}`,
            evidence: { ...row },
            cleanupAction: "delete-broken-relation",
            cleanupMode: "automatic",
            createdAt: text(row.created_at),
            updatedAt: text(row.updated_at),
          }),
        );
      }
    }
    for (const row of overrides) {
      if (!context.users.has(text(row.uid))) {
        issues.push(
          makeIssue({
            category: "product",
            severity: "critical",
            database: "product",
            table: "pharmacy_profile_product_overrides",
            recordId: text(row.id),
            ownerUid: text(row.uid),
            title: "منتج صيدلية مخصص بلا مالك صالح",
            details: `uid=${text(row.uid)}, fixedProduct=${text(row.fixed_product_id)}`,
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
    return reviews.length + helpful.length + replies.length + overrides.length;
  }
}
