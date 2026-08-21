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
import { DataHealthPart1 } from "./data-health.repository.part-01";
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

export abstract class DataHealthPart2 extends DataHealthPart1 {
  async scan(): Promise<DataHealthReport> {
    const execution = resolveDataHealthExecutionContext();
    const runId = randomUUID();
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    await this.insertRun(runId, startedAt);

    try {
      const [userRows, productRows, profileRows] = await Promise.all([
        usersDataSource.execute(
          "SELECT uid FROM users WHERE deleted_at IS NULL",
        ) as Promise<Row[]>,
        productsDataSource.execute(
          "SELECT id, uid, main_name, pharmacy_name_ar, pharmacy_name_en, pharmacy_catalog_kind, status, images_json, created_at, updated_at FROM products",
        ) as Promise<Row[]>,
        profilesDataSource.execute(
          "SELECT uid, store_name FROM user_profiles",
        ) as Promise<Row[]>,
      ]);

      const ordersDb = createMarketplaceOrdersDb();
      const [orderRows, sellerOrderRows, customItemRows] = await Promise.all([
        ordersDb.execute(
          "SELECT id, order_number, buyer_id, calculated_status, closed_at, archived_at, created_at, updated_at FROM orders",
        ),
        ordersDb.execute(
          "SELECT id, order_id, seller_id, service_provider_id, status, created_at, updated_at FROM seller_orders",
        ),
        ordersDb.execute(
          "SELECT id, order_id, seller_order_id, seller_id, service_provider_id, status, created_at, updated_at FROM custom_request_items",
        ),
      ]);
      const orders = realRows(orderRows);
      const sellerOrders = realRows(sellerOrderRows);
      const customItems = realRows(customItemRows);

      const context: ScanContext = {
        users: new Set(userRows.map((row) => text(row.uid))),
        products: new Set(productRows.map((row) => text(row.id))),
        profiles: new Set(profileRows.map((row) => text(row.uid))),
        orders: new Set(orders.map((row) => text(row.id))),
        sellerOrders: new Set(sellerOrders.map((row) => text(row.id))),
        customItems: new Set(customItems.map((row) => text(row.id))),
      };
      const issues: DataHealthIssue[] = [];
      let scannedRecords =
        userRows.length +
        productRows.length +
        profileRows.length +
        orders.length +
        sellerOrders.length +
        customItems.length;

      this.collectProductIssues(issues, productRows, context);
      this.collectOrderHeaderIssues(
        issues,
        orders,
        sellerOrders,
        customItems,
        context,
      );

      const profileCount = await this.collectProfileIssues(issues, context);
      const productRelationCount = await this.collectProductRelationIssues(
        issues,
        context,
      );
      const orderCount = await this.collectOrderRelationIssues(issues, context);
      const advertisementCount = await this.collectAdvertisementIssues(
        issues,
        context,
      );
      const integrityCount = await this.collectDatabaseIntegrityIssues(issues);
      scannedRecords +=
        profileCount +
        productRelationCount +
        orderCount +
        advertisementCount +
        integrityCount;

      const inventory = await storageInventoryRepository.collect();
      scannedRecords += inventory.scannedRecords;
      this.collectStorageIssues(issues, inventory);
      const topology = await this.collectTopology(inventory, execution.runtime);

      for (const warning of inventory.warnings) {
        issues.push(
          makeIssue({
            category: "image",
            severity: "warning",
            database: "storage",
            table: "storage_provider",
            recordId: warning.split(":")[0],
            ownerUid: "",
            title: "تعذر إكمال جرد أحد مخازن الصور",
            details: warning,
            evidence: { warning },
            cleanupAction: "none",
            cleanupMode: "manual",
          }),
        );
      }

      const firstSeenByFingerprint = await this.applyFindingState(issues);
      issues.sort(
        (a, b) =>
          severityRank(a.severity) - severityRank(b.severity) ||
          a.category.localeCompare(b.category) ||
          a.title.localeCompare(b.title, "ar"),
      );

      const durationMs = Date.now() - startedMs;
      const report: DataHealthReport = {
        runId,
        generatedAt: new Date().toISOString(),
        durationMs,
        environment: execution.environment,
        execution: {
          runtime: execution.runtime,
          databaseSource: execution.databaseSource,
          storageSource: execution.storageSource,
          schemaComparisonAllowed: execution.schemaComparisonAllowed,
        },
        scannedRecords,
        summary: {
          total: issues.length,
          critical: issues.filter((issue) => issue.severity === "critical")
            .length,
          warning: issues.filter((issue) => issue.severity === "warning")
            .length,
          info: issues.filter((issue) => issue.severity === "info").length,
          cleanable: issues.filter((issue) => issue.canClean).length,
          quarantined: issues.filter((issue) => issue.state === "quarantined")
            .length,
        },
        issues,
        schemaComparison: {
          available: execution.schemaComparisonAllowed,
          readOnly: true,
          generatedAt: new Date().toISOString(),
          databases: [],
        },
        topology,
      };
      await this.persistReport(report, firstSeenByFingerprint);
      return report;
    } catch (error) {
      await profilesDataSource.execute(
        "UPDATE data_health_runs SET status='failed', completed_at=?, duration_ms=?, error_message=? WHERE id=?",
        [
          new Date().toISOString(),
          Date.now() - startedMs,
          error instanceof Error ? error.message : String(error),
          runId,
        ],
      );
      throw error;
    }
  }
}
