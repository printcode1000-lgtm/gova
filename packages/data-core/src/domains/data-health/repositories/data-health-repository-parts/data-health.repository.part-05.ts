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
import { DATA_HEALTH_METADATA_STATEMENTS } from "../../db/metadata-schema";
import { storageInventoryRepository } from "../storage-inventory.repository.server";
import { DataHealthPart4 } from "./data-health.repository.part-04";
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

export abstract class DataHealthPart5 extends DataHealthPart4 {
  async addManualAudit(input: {
    adminUid: string;
    action: string;
    recordId: string;
    fingerprint: string;
    status: string;
    reason?: string;
  }) {
    await this.ensureMetadata();
    const now = new Date().toISOString();
    await profilesDataSource.execute(
      "INSERT INTO data_health_cleanup_audit (id, plan_id, run_id, admin_uid, environment, issue_id, fingerprint, action, record_id, before_json, after_json, status, reason, created_at) VALUES (?, '', '', ?, ?, ?, ?, ?, ?, '{}', '{}', ?, ?, ?)",
      [
        randomUUID(),
        input.adminUid,
        resolveDataHealthExecutionContext().environment,
        input.fingerprint,
        input.fingerprint,
        input.action,
        input.recordId,
        input.status,
        input.reason ?? "",
        now,
      ],
    );
  }

  protected async insertRun(runId: string, startedAt: string) {
    await this.ensureMetadata();
    await profilesDataSource.execute(
      "INSERT INTO data_health_runs (id, environment, status, started_at) VALUES (?, ?, 'running', ?)",
      [runId, resolveDataHealthExecutionContext().environment, startedAt],
    );
  }

  protected collectProductIssues(
    issues: DataHealthIssue[],
    products: Row[],
    context: ScanContext,
  ) {
    for (const product of products) {
      const id = text(product.id);
      const ownerUid = text(product.uid);
      const catalogKind = text(product.pharmacy_catalog_kind);
      const title =
        text(product.main_name) ||
        text(product.pharmacy_name_ar) ||
        text(product.pharmacy_name_en) ||
        id;
      if (
        (!ownerUid || !context.users.has(ownerUid)) &&
        catalogKind !== "fixed"
      ) {
        issues.push(
          makeIssue({
            category: "product",
            severity: "critical",
            database: "product",
            table: "products",
            recordId: id,
            ownerUid,
            title: `منتج بلا مالك صالح: ${title}`,
            details: ownerUid
              ? `المالك ${ownerUid} غير موجود أو محذوف.`
              : "معرف المالك فارغ.",
            evidence: {
              ownerUid,
              status: text(product.status),
              catalogKind,
            },
            cleanupAction:
              text(product.status) === "archived" ? "none" : "archive-product",
            cleanupMode:
              text(product.status) === "archived" ? "manual" : "automatic",
            route: routeFor("product", "products", id),
            createdAt: text(product.created_at),
            updatedAt: text(product.updated_at),
          }),
        );
      }
      const parsed = parseJson(product.images_json);
      if (!Array.isArray(parsed)) {
        issues.push(
          makeIssue({
            category: "image",
            severity: "warning",
            database: "product",
            table: "products",
            recordId: id,
            ownerUid,
            title: `بيانات صور المنتج تالفة: ${title}`,
            details: "حقل images_json ليس مصفوفة JSON صالحة.",
            evidence: { imagesJson: text(product.images_json).slice(0, 500) },
            cleanupAction: "none",
            cleanupMode: "manual",
            route: routeFor("product", "products", id),
            createdAt: text(product.created_at),
            updatedAt: text(product.updated_at),
          }),
        );
      }
    }
  }
}
