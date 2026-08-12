import { advertisementsDataSource, productsDataSource, profilesDataSource, usersDataSource } from "@/modules/data-access/core";
import "server-only";
import { randomUUID } from "node:crypto";
import {
  DATABASE_SHARDS,
  DATABASE_SHARD_NAMES,
  DATABASE_SHARD_TABLE_TO_DATABASE,
  MARKETPLACE_ORDER_TABLE_TO_DATABASE,
} from "@/modules/data-access/core/database/database-shards";
import { ShardedRawDatabaseClient } from "@/modules/data-access/core/database/sharded-raw-database-client";
import { getAllStorageProfiles } from "@/core/storage/profiles/storage-profile-loader.server";
import { storageFolderCandidates } from "@/core/storage/storage/storage-profile-path";
import { createMarketplaceOrdersDb } from "@/modules/data-access/domains/marketplace-orders/db/client";
import {
  DATA_HEALTH_POLICY,
  isOlderThan,
  makeIssue,
  quarantineResourceType,
  severityRank,
} from "@/modules/data-health/domain/policy";
import { resolveDataHealthExecutionContext } from "@/modules/data-health/domain/execution-context.server";
import { DATA_HEALTH_IMAGE_SOURCES } from "@/modules/data-health/domain/source-registry";
import type {
  DataHealthAuditEntry,
  DataHealthCleanupAction,
  DataHealthCleanupResult,
  DataHealthHistoryEntry,
  DataHealthIssue,
  DataHealthQuarantineEntry,
  DataHealthReport,
  DataHealthTopology,
} from "@/modules/data-health/domain/types";
import { DATA_HEALTH_METADATA_STATEMENTS } from "@/modules/data-access/domains/data-health/db/metadata-schema";
import { storageInventoryRepository } from "@/modules/data-access/domains/data-health/repositories/storage-inventory.repository.server";
import { DataHealthPart5 } from "./data-health.repository.part-05";
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

export abstract class DataHealthPart6 extends DataHealthPart5 {
  protected collectOrderHeaderIssues(
    issues: DataHealthIssue[],
    orders: Row[],
    sellerOrders: Row[],
    customItems: Row[],
    context: ScanContext,
  ) {
    for (const order of orders) {
      const id = text(order.id);
      const buyerId = text(order.buyer_id);
      const closedAt = text(order.closed_at);
      const archivedAt = text(order.archived_at);
      if (!context.users.has(buyerId)) {
        issues.push(
          makeIssue({
            category: "order",
            severity: "critical",
            database: "orders-core",
            table: "orders",
            recordId: id,
            ownerUid: buyerId,
            title: `طلب بلا مشتري صالح: ${text(order.order_number) || id}`,
            details: `buyer_id=${buyerId || "empty"}`,
            evidence: {
              buyerId,
              status: text(order.calculated_status),
              archivedAt,
            },
            cleanupAction: archivedAt ? "none" : "archive-order",
            cleanupMode: archivedAt ? "protected" : "automatic",
            route: routeFor("orders-core", "orders", id),
            createdAt: text(order.created_at),
            updatedAt: text(order.updated_at),
          }),
        );
      } else if (
        !archivedAt &&
        closedAt &&
        isOlderThan(closedAt, DATA_HEALTH_POLICY.closedOrderRetentionDays)
      ) {
        issues.push(
          makeIssue({
            category: "order",
            severity: "info",
            database: "orders-core",
            table: "orders",
            recordId: id,
            ownerUid: buyerId,
            title: `طلب مغلق تجاوز مدة الاحتفاظ: ${text(order.order_number) || id}`,
            details: `مغلق منذ أكثر من ${DATA_HEALTH_POLICY.closedOrderRetentionDays} يومًا ويمكن أرشفته دون حذف سجله المالي.`,
            evidence: { closedAt, archivedAt },
            cleanupAction: "archive-order",
            cleanupMode: "automatic",
            route: routeFor("orders-core", "orders", id),
            createdAt: text(order.created_at),
            updatedAt: text(order.updated_at),
          }),
        );
      }
    }

    for (const row of sellerOrders) {
      const sellerId = text(row.seller_id);
      const providerId = text(row.service_provider_id);
      if (
        !context.orders.has(text(row.order_id)) ||
        !context.users.has(sellerId) ||
        (providerId && !context.users.has(providerId))
      ) {
        issues.push(
          makeIssue({
            category: "order",
            severity: "critical",
            database: "orders-core",
            table: "seller_orders",
            recordId: text(row.id),
            ownerUid: sellerId,
            title: "طلب بائع مرتبط بطرف غير موجود",
            details: `order=${text(row.order_id)}, seller=${sellerId}, provider=${providerId}`,
            evidence: {
              orderId: text(row.order_id),
              sellerId,
              providerId,
            },
            cleanupAction: "none",
            cleanupMode: "protected",
            createdAt: text(row.created_at),
            updatedAt: text(row.updated_at),
          }),
        );
      }
    }

    for (const row of customItems) {
      const sellerId = text(row.seller_id);
      const providerId = text(row.service_provider_id);
      if (
        !context.orders.has(text(row.order_id)) ||
        !context.sellerOrders.has(text(row.seller_order_id)) ||
        (sellerId && !context.users.has(sellerId)) ||
        (providerId && !context.users.has(providerId))
      ) {
        issues.push(
          makeIssue({
            category: "order",
            severity: "critical",
            database: "orders-items",
            table: "custom_request_items",
            recordId: text(row.id),
            ownerUid: sellerId || providerId,
            title: "طلب مخصص مرتبط بسجل أو طرف غير موجود",
            details: `order=${text(row.order_id)}, sellerOrder=${text(row.seller_order_id)}`,
            evidence: {
              orderId: text(row.order_id),
              sellerOrderId: text(row.seller_order_id),
              sellerId,
              providerId,
            },
            cleanupAction: "none",
            cleanupMode: "protected",
            createdAt: text(row.created_at),
            updatedAt: text(row.updated_at),
          }),
        );
      }
    }
  }
}
