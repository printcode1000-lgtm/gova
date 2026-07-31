import "server-only";

import { randomUUID } from "node:crypto";

import { advertisementsDbClient } from "@/core/database/advertisements-db-client";
import { dbClient } from "@/core/database/db-client";
import { MARKETPLACE_ORDER_TABLE_TO_DATABASE } from "@/core/database/database-shards";
import { productDbClient } from "@/core/database/product-db-client";
import { profileDbClient } from "@/core/database/profile-db-client";
import { getAllStorageProfiles } from "@/core/storage/profiles/storage-profile-loader.server";
import { storageFolderCandidates } from "@/core/storage/storage/storage-profile-path";
import { createMarketplaceOrdersDb } from "@/modules/marketplace-orders/db/client";

import {
  DATA_HEALTH_POLICY,
  isOlderThan,
  makeIssue,
  severityRank,
} from "../domain/policy";
import { resolveDataHealthExecutionContext } from "../domain/execution-context.server";
import type {
  DataHealthAuditEntry,
  DataHealthCleanupAction,
  DataHealthCleanupResult,
  DataHealthHistoryEntry,
  DataHealthIssue,
  DataHealthQuarantineEntry,
  DataHealthReport,
} from "../domain/types";
import { DATA_HEALTH_METADATA_STATEMENTS } from "../db/metadata-schema";
import { storageInventoryRepository } from "./storage-inventory.repository.server";

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
  return MARKETPLACE_ORDER_TABLE_TO_DATABASE[
    table as keyof typeof MARKETPLACE_ORDER_TABLE_TO_DATABASE
  ] ?? "orders-core";
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

export class DataHealthRepository {
  private metadataReady = false;

  private async ensureMetadata() {
    if (this.metadataReady) return;
    for (const statement of DATA_HEALTH_METADATA_STATEMENTS) {
      await profileDbClient.execute(statement);
    }
    this.metadataReady = true;
  }

  async saveCleanupPlan(input: {
    id: string;
    adminUid: string;
    environment: string;
    runId: string;
    issueIds: string[];
    snapshots: Record<string, string>;
    createdAt: string;
    expiresAt: string;
  }) {
    await this.ensureMetadata();
    await profileDbClient.execute(
      "INSERT INTO data_health_cleanup_plans (id, admin_uid, environment, run_id, issue_ids_json, snapshots_json, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        input.id,
        input.adminUid,
        input.environment,
        input.runId,
        JSON.stringify(input.issueIds),
        JSON.stringify(input.snapshots),
        input.createdAt,
        input.expiresAt,
      ],
    );
  }

  async getCleanupPlan(planId: string): Promise<Row | undefined> {
    await this.ensureMetadata();
    const rows = (await profileDbClient.execute(
      "SELECT id, admin_uid, environment, issue_ids_json, snapshots_json, expires_at, consumed_at FROM data_health_cleanup_plans WHERE id=? LIMIT 1",
      [planId],
    )) as Row[];
    return rows[0];
  }

  async consumeCleanupPlan(planId: string, consumedAt: string) {
    await this.ensureMetadata();
    await profileDbClient.execute(
      "UPDATE data_health_cleanup_plans SET consumed_at=? WHERE id=? AND consumed_at=''",
      [consumedAt, planId],
    );
  }

  async acquireCleanupLock(input: {
    token: string;
    adminUid: string;
    now: string;
    lockedUntil: string;
  }): Promise<boolean> {
    await this.ensureMetadata();
    const rows = (await profileDbClient.execute(
      "INSERT INTO data_health_locks (id, token, owner_uid, locked_until, created_at) VALUES ('cleanup', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET token=excluded.token, owner_uid=excluded.owner_uid, locked_until=excluded.locked_until, created_at=excluded.created_at WHERE data_health_locks.locked_until < ? RETURNING token",
      [input.token, input.adminUid, input.lockedUntil, input.now, input.now],
    )) as Row[];
    return text(rows[0]?.token) === input.token;
  }

  async releaseCleanupLock(token: string) {
    await this.ensureMetadata();
    await profileDbClient.execute(
      "DELETE FROM data_health_locks WHERE id='cleanup' AND token=?",
      [token],
    );
  }

  async scan(): Promise<DataHealthReport> {
    const execution = resolveDataHealthExecutionContext();
    const runId = randomUUID();
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    await this.insertRun(runId, startedAt);

    try {
      const [userRows, productRows, profileRows] = await Promise.all([
        dbClient.execute(
          "SELECT uid FROM users WHERE deleted_at IS NULL",
        ) as Promise<Row[]>,
        productDbClient.execute(
          "SELECT id, uid, main_name, pharmacy_name_ar, pharmacy_name_en, pharmacy_catalog_kind, status, images_json, created_at, updated_at FROM products",
        ) as Promise<Row[]>,
        profileDbClient.execute(
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
      };
      await this.persistReport(report, firstSeenByFingerprint);
      return report;
    } catch (error) {
      await profileDbClient.execute(
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

  async history(): Promise<{
    runs: DataHealthHistoryEntry[];
    audit: DataHealthAuditEntry[];
    quarantine: DataHealthQuarantineEntry[];
  }> {
    await this.ensureMetadata();
    const [runs, audit, quarantine] = await Promise.all([
      profileDbClient.execute(
        "SELECT id, environment, status, started_at, completed_at, duration_ms, scanned_records, issue_count, critical_count, warning_count, info_count, cleanable_count FROM data_health_runs ORDER BY started_at DESC LIMIT ?",
        [DATA_HEALTH_POLICY.historyLimit],
      ) as Promise<Row[]>,
      profileDbClient.execute(
        "SELECT id, plan_id, admin_uid, environment, issue_id, action, record_id, status, reason, created_at FROM data_health_cleanup_audit ORDER BY created_at DESC LIMIT 100",
      ) as Promise<Row[]>,
      profileDbClient.execute(
        "SELECT id, fingerprint, resource_type, storage_profile_id, resource_key, database_name, table_name, record_id, reason, quarantined_by, quarantined_at, eligible_for_deletion_at, last_verified_at FROM data_health_quarantine WHERE COALESCE(released_at, '')='' AND COALESCE(deleted_at, '')='' ORDER BY quarantined_at DESC LIMIT 200",
      ) as Promise<Row[]>,
    ]);
    return {
      runs: runs.map((row) => ({
        id: text(row.id),
        environment: text(row.environment),
        status: text(row.status),
        startedAt: text(row.started_at),
        completedAt: text(row.completed_at),
        durationMs: numberValue(row.duration_ms),
        scannedRecords: numberValue(row.scanned_records),
        total: numberValue(row.issue_count),
        critical: numberValue(row.critical_count),
        warning: numberValue(row.warning_count),
        info: numberValue(row.info_count),
        cleanable: numberValue(row.cleanable_count),
      })),
      audit: audit.map((row) => ({
        id: text(row.id),
        planId: text(row.plan_id),
        adminUid: text(row.admin_uid),
        environment: text(row.environment),
        issueId: text(row.issue_id),
        action: text(row.action),
        recordId: text(row.record_id),
        status: text(row.status),
        reason: text(row.reason),
        createdAt: text(row.created_at),
      })),
      quarantine: quarantine.map((row) => ({
        id: text(row.id),
        fingerprint: text(row.fingerprint),
        resourceType: text(row.resource_type),
        storageProfileId: text(row.storage_profile_id),
        resourceKey: text(row.resource_key),
        database: text(row.database_name),
        table: text(row.table_name),
        recordId: text(row.record_id),
        reason: text(row.reason),
        quarantinedBy: text(row.quarantined_by),
        quarantinedAt: text(row.quarantined_at),
        eligibleForDeletionAt: text(row.eligible_for_deletion_at),
        lastVerifiedAt: text(row.last_verified_at),
        eligible: Date.parse(text(row.eligible_for_deletion_at)) <= Date.now(),
      })),
    };
  }

  async clearRunHistory(): Promise<{ runs: number; findings: number }> {
    await this.ensureMetadata();
    const findingRows = (await profileDbClient.execute(
      "DELETE FROM data_health_findings RETURNING id",
    )) as Row[];
    const runRows = (await profileDbClient.execute(
      "DELETE FROM data_health_runs RETURNING id",
    )) as Row[];
    return { runs: runRows.length, findings: findingRows.length };
  }

  async clearCleanupAudit(): Promise<{ audit: number }> {
    await this.ensureMetadata();
    const rows = (await profileDbClient.execute(
      "DELETE FROM data_health_cleanup_audit RETURNING id",
    )) as Row[];
    return { audit: rows.length };
  }

  async getQuarantineEntry(id: string): Promise<Row | undefined> {
    await this.ensureMetadata();
    const rows = (await profileDbClient.execute(
      "SELECT id, fingerprint, resource_type, storage_profile_id, resource_key, database_name, table_name, record_id, eligible_for_deletion_at, released_at, deleted_at FROM data_health_quarantine WHERE id=? LIMIT 1",
      [id],
    )) as Row[];
    return rows[0];
  }

  async listActiveQuarantineEntries(): Promise<Row[]> {
    await this.ensureMetadata();
    return (await profileDbClient.execute(
      "SELECT id, fingerprint, resource_type, storage_profile_id, resource_key, database_name, table_name, record_id, eligible_for_deletion_at, released_at, deleted_at FROM data_health_quarantine WHERE COALESCE(released_at, '')='' AND COALESCE(deleted_at, '')='' ORDER BY quarantined_at ASC",
    )) as Row[];
  }

  async markQuarantineDeleted(id: string, deletedAt: string) {
    await this.ensureMetadata();
    const rows = (await profileDbClient.execute(
      "UPDATE data_health_quarantine SET deleted_at=?, last_verified_at=? WHERE id=? AND COALESCE(released_at, '')='' AND COALESCE(deleted_at, '')='' RETURNING id",
      [deletedAt, deletedAt, id],
    )) as Row[];
    if (!resultChanged(rows)) throw new Error("quarantineChangedOrMissing");
  }

  async deleteQuarantineEntry(id: string) {
    await this.ensureMetadata();
    const rows = (await profileDbClient.execute(
      "DELETE FROM data_health_quarantine WHERE id=? RETURNING id",
      [id],
    )) as Row[];
    if (!resultChanged(rows)) throw new Error("quarantineChangedOrMissing");
  }

  async releaseQuarantine(id: string, releasedAt: string) {
    await this.ensureMetadata();
    const rows = (await profileDbClient.execute(
      "UPDATE data_health_quarantine SET released_at=?, last_verified_at=? WHERE id=? AND COALESCE(released_at, '')='' AND COALESCE(deleted_at, '')='' RETURNING id",
      [releasedAt, releasedAt, id],
    )) as Row[];
    if (!resultChanged(rows)) throw new Error("quarantineChangedOrMissing");
  }

  async clearActiveQuarantine(input: {
    adminUid: string;
    clearedAt: string;
  }): Promise<number> {
    await this.ensureMetadata();
    const rows = (await profileDbClient.execute(
      "DELETE FROM data_health_quarantine RETURNING id",
    )) as Row[];
    const cleared = rows.length;
    await profileDbClient.execute(
      "UPDATE data_health_findings SET state='recurring', last_seen_at=? WHERE state='quarantined'",
      [input.clearedAt],
    );
    await this.addManualAudit({
      adminUid: input.adminUid,
      action: "clear-quarantine",
      recordId: "data_health_quarantine",
      fingerprint: `clear-quarantine:${input.clearedAt}`,
      status: "cleaned",
      reason: `cleared=${cleared}`,
    });
    return cleared;
  }

  async resetQuarantinedFindings(updatedAt: string) {
    await this.ensureMetadata();
    await profileDbClient.execute(
      "UPDATE data_health_findings SET state='recurring', last_seen_at=? WHERE state='quarantined'",
      [updatedAt],
    );
  }

  async getQuarantinedOriginalCleanupTarget(
    entry: Row,
  ): Promise<QuarantinedOriginalCleanupResult> {
    const database = text(entry.database_name);
    const table = text(entry.table_name);
    const id = text(entry.record_id);
    const storageObjects: Array<{ storageProfileId: string; imageKey: string }> =
      [];
    if (!database || !table || !id) {
      return { deletedRecords: 0, storageObjects };
    }

    if (database === "profile" && table === "profile_images") {
      const rows = (await profileDbClient.execute(
        "SELECT image_key, image_type FROM profile_images WHERE id=? LIMIT 1",
        [id],
      )) as Row[];
      const row = rows[0];
      const imageKey = text(row?.image_key);
      if (imageKey) {
        storageObjects.push({
          storageProfileId:
            text(row?.image_type) === "avatar" ? "avatar" : "cover",
          imageKey,
        });
      }
      return { deletedRecords: rows.length, storageObjects };
    }

    if (database === "profile" && table === "user_profiles") {
      const rows = (await profileDbClient.execute(
        "SELECT uid FROM user_profiles WHERE uid=? LIMIT 1",
        [id],
      )) as Row[];
      return { deletedRecords: rows.length, storageObjects };
    }

    if (
      database === "product" &&
      table === "pharmacy_profile_product_overrides"
    ) {
      const rows = (await productDbClient.execute(
        "SELECT image_key FROM pharmacy_profile_product_overrides WHERE id=? LIMIT 1",
        [id],
      )) as Row[];
      const imageKey = text(rows[0]?.image_key);
      if (imageKey && !imageKey.startsWith("pharmacy-fixed/")) {
        storageObjects.push({ storageProfileId: "product-default", imageKey });
      }
      return { deletedRecords: rows.length, storageObjects };
    }

    if (database === "orders-items" && table === "custom_request_images") {
      const ordersDb = createMarketplaceOrdersDb();
      const rows = (await ordersDb.execute(
        "SELECT storage_profile_id, image_key FROM custom_request_images WHERE id=? LIMIT 1",
        [id],
      )) as Row[];
      const imageKey = text(rows[0]?.image_key);
      if (imageKey) {
        storageObjects.push({
          storageProfileId: text(rows[0]?.storage_profile_id) || "spicialOrder",
          imageKey,
        });
      }
      return { deletedRecords: rows.length, storageObjects };
    }

    throw new Error(`unsupportedQuarantineRecord:${database}.${table}`);
  }

  async deleteQuarantinedOriginalRecord(entry: Row): Promise<number> {
    const database = text(entry.database_name);
    const table = text(entry.table_name);
    const id = text(entry.record_id);
    if (!database || !table || !id) return 0;

    if (database === "profile" && table === "profile_images") {
      const deleted = (await profileDbClient.execute(
        "DELETE FROM profile_images WHERE id=? RETURNING id",
        [id],
      )) as Row[];
      return deleted.length;
    }

    if (database === "profile" && table === "user_profiles") {
      const deleted = (await profileDbClient.execute(
        "DELETE FROM user_profiles WHERE uid=? RETURNING uid AS id",
        [id],
      )) as Row[];
      return deleted.length;
    }

    if (
      database === "product" &&
      table === "pharmacy_profile_product_overrides"
    ) {
      const deleted = (await productDbClient.execute(
        "DELETE FROM pharmacy_profile_product_overrides WHERE id=? RETURNING id",
        [id],
      )) as Row[];
      return deleted.length;
    }

    if (database === "orders-items" && table === "custom_request_images") {
      const ordersDb = createMarketplaceOrdersDb();
      const deleted = (await ordersDb.execute(
        "DELETE FROM custom_request_images WHERE id=? RETURNING id",
        [id],
      )) as Row[];
      return deleted.length;
    }

    throw new Error(`unsupportedQuarantineRecord:${database}.${table}`);
  }

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
    await profileDbClient.execute(
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

  private async insertRun(runId: string, startedAt: string) {
    await this.ensureMetadata();
    await profileDbClient.execute(
      "INSERT INTO data_health_runs (id, environment, status, started_at) VALUES (?, ?, 'running', ?)",
      [runId, resolveDataHealthExecutionContext().environment, startedAt],
    );
  }

  private collectProductIssues(
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

  private collectOrderHeaderIssues(
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

  private async collectProfileIssues(
    issues: DataHealthIssue[],
    context: ScanContext,
  ): Promise<number> {
    const [
      images,
      featured,
      follows,
      carriers,
      reviews,
      helpful,
      replies,
      usages,
    ] = await Promise.all([
      profileDbClient.execute(
        "SELECT id, uid, image_key, image_type, created_at, updated_at FROM profile_images",
      ) as Promise<Row[]>,
      profileDbClient.execute(
        "SELECT uid, product_id, created_at FROM profile_featured_products",
      ) as Promise<Row[]>,
      profileDbClient.execute(
        "SELECT id, follower_uid, target_type, target_id, target_owner_uid, created_at FROM follows",
      ) as Promise<Row[]>,
      profileDbClient.execute(
        "SELECT seller_uid, carrier_uid, created_at, updated_at FROM profile_delivery_carriers",
      ) as Promise<Row[]>,
      profileDbClient.execute(
        "SELECT id, target_uid, uid, created_at, updated_at FROM profile_reviews",
      ) as Promise<Row[]>,
      profileDbClient.execute(
        "SELECT review_id, uid, created_at FROM profile_review_helpful",
      ) as Promise<Row[]>,
      profileDbClient.execute(
        "SELECT id, review_id, seller_uid, created_at, updated_at FROM profile_review_replies",
      ) as Promise<Row[]>,
      profileDbClient.execute(
        "SELECT id, discount_id, seller_uid, buyer_uid, order_id, created_at FROM seller_discount_usages",
      ) as Promise<Row[]>,
    ]);
    const reviewIds = new Set(reviews.map((row) => text(row.id)));

    for (const uid of context.profiles) {
      if (!context.users.has(uid)) {
        issues.push(
          makeIssue({
            category: "profile",
            severity: "critical",
            database: "profile",
            table: "user_profiles",
            recordId: uid,
            ownerUid: uid,
            title: "بروفايل بلا مستخدم مالك",
            details: `لا يوجد مستخدم نشط بالمعرف ${uid}.`,
            evidence: { uid },
            cleanupAction: "quarantine-record",
            cleanupMode: "quarantine",
            route: routeFor("profile", "user_profiles", uid),
          }),
        );
      }
    }

    for (const row of images) {
      const uid = text(row.uid);
      if (
        !context.users.has(uid) ||
        !context.profiles.has(uid) ||
        !text(row.image_key)
      ) {
        issues.push(
          makeIssue({
            category: "image",
            severity: "critical",
            database: "profile",
            table: "profile_images",
            recordId: text(row.id),
            ownerUid: uid,
            title: "سجل صورة بروفايل بلا مالك أو مفتاح صالح",
            details: `uid=${uid || "empty"}, imageKey=${text(row.image_key) || "empty"}`,
            evidence: {
              uid,
              imageKey: text(row.image_key),
              imageType: text(row.image_type),
            },
            cleanupAction: "quarantine-record",
            cleanupMode: "quarantine",
            relatedId: text(row.image_key),
            createdAt: text(row.created_at),
            updatedAt: text(row.updated_at),
          }),
        );
      }
    }

    for (const row of featured) {
      if (
        !context.profiles.has(text(row.uid)) ||
        !context.products.has(text(row.product_id))
      ) {
        this.pushBrokenRelation(issues, {
          table: "profile_featured_products",
          recordId: `${text(row.uid)}|${text(row.product_id)}`,
          ownerUid: text(row.uid),
          details: `uid=${text(row.uid)}, product=${text(row.product_id)}`,
          createdAt: text(row.created_at),
        });
      }
    }

    for (const row of follows) {
      const follower = text(row.follower_uid);
      const owner = text(row.target_owner_uid);
      const targetType = text(row.target_type);
      const targetId = text(row.target_id);
      const targetExists =
        targetType === "profile"
          ? context.profiles.has(targetId)
          : targetType === "product"
            ? context.products.has(targetId)
            : false;
      if (
        !context.users.has(follower) ||
        (owner && !context.users.has(owner)) ||
        !targetExists
      ) {
        this.pushBrokenRelation(issues, {
          table: "follows",
          recordId: text(row.id),
          ownerUid: follower,
          details: `follower=${follower}, target=${targetType}:${targetId}, owner=${owner}`,
          createdAt: text(row.created_at),
        });
      }
    }

    for (const row of carriers) {
      if (
        !context.profiles.has(text(row.seller_uid)) ||
        !context.users.has(text(row.carrier_uid))
      ) {
        this.pushBrokenRelation(issues, {
          table: "profile_delivery_carriers",
          recordId: `${text(row.seller_uid)}|${text(row.carrier_uid)}`,
          ownerUid: text(row.seller_uid),
          details: `seller=${text(row.seller_uid)}, carrier=${text(row.carrier_uid)}`,
          createdAt: text(row.created_at),
          updatedAt: text(row.updated_at),
        });
      }
    }

    for (const row of reviews) {
      if (
        !context.profiles.has(text(row.target_uid)) ||
        !context.users.has(text(row.uid))
      ) {
        this.pushBrokenRelation(issues, {
          table: "profile_reviews",
          recordId: text(row.id),
          ownerUid: text(row.uid),
          details: `target=${text(row.target_uid)}, reviewer=${text(row.uid)}`,
          createdAt: text(row.created_at),
          updatedAt: text(row.updated_at),
        });
      }
    }
    for (const row of helpful) {
      if (
        !reviewIds.has(text(row.review_id)) ||
        !context.users.has(text(row.uid))
      ) {
        this.pushBrokenRelation(issues, {
          table: "profile_review_helpful",
          recordId: `${text(row.review_id)}|${text(row.uid)}`,
          ownerUid: text(row.uid),
          details: `review=${text(row.review_id)}, uid=${text(row.uid)}`,
          createdAt: text(row.created_at),
        });
      }
    }
    for (const row of replies) {
      if (
        !reviewIds.has(text(row.review_id)) ||
        !context.users.has(text(row.seller_uid))
      ) {
        this.pushBrokenRelation(issues, {
          table: "profile_review_replies",
          recordId: text(row.id),
          ownerUid: text(row.seller_uid),
          details: `review=${text(row.review_id)}, seller=${text(row.seller_uid)}`,
          createdAt: text(row.created_at),
          updatedAt: text(row.updated_at),
        });
      }
    }
    for (const row of usages) {
      const buyer = text(row.buyer_uid);
      if (
        !context.users.has(text(row.seller_uid)) ||
        (buyer && !context.users.has(buyer)) ||
        (text(row.order_id) && !context.orders.has(text(row.order_id)))
      ) {
        issues.push(
          makeIssue({
            category: "discount",
            severity: "warning",
            database: "profile",
            table: "seller_discount_usages",
            recordId: text(row.id),
            ownerUid: text(row.seller_uid),
            title: "استخدام خصم مرتبط بطرف أو طلب غير موجود",
            details: `seller=${text(row.seller_uid)}, buyer=${buyer}, order=${text(row.order_id)}`,
            evidence: { ...row },
            cleanupAction: "none",
            cleanupMode: "protected",
            createdAt: text(row.created_at),
          }),
        );
      }
    }
    return (
      images.length +
      featured.length +
      follows.length +
      carriers.length +
      reviews.length +
      helpful.length +
      replies.length +
      usages.length
    );
  }

  private async collectProductRelationIssues(
    issues: DataHealthIssue[],
    context: ScanContext,
  ): Promise<number> {
    const [reviews, helpful, replies, overrides] = await Promise.all([
      productDbClient.execute(
        "SELECT id, product_id, uid, created_at, updated_at FROM product_reviews",
      ) as Promise<Row[]>,
      productDbClient.execute(
        "SELECT review_id, uid, created_at FROM product_review_helpful",
      ) as Promise<Row[]>,
      productDbClient.execute(
        "SELECT id, review_id, seller_uid, created_at, updated_at FROM product_review_replies",
      ) as Promise<Row[]>,
      productDbClient.execute(
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

  private async collectOrderRelationIssues(
    issues: DataHealthIssue[],
    context: ScanContext,
  ): Promise<number> {
    const db = createMarketplaceOrdersDb();
    const [itemRows, imageRows, shipmentRows, paymentRows, returnRows, replacementRows] =
      await Promise.all([
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

  private async collectAdvertisementIssues(
    issues: DataHealthIssue[],
    context: ScanContext,
  ): Promise<number> {
    const [featured, hero, trending] = await Promise.all([
      advertisementsDbClient.execute(
        "SELECT id, product_ids_json, updated_at FROM featured_marquee",
      ) as Promise<Row[]>,
      advertisementsDbClient.execute(
        "SELECT id, config_json, updated_at FROM hero_slider",
      ) as Promise<Row[]>,
      advertisementsDbClient.execute(
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

  private async collectDatabaseIntegrityIssues(
    issues: DataHealthIssue[],
  ): Promise<number> {
    const databases = [
      ["users", dbClient],
      ["profile", profileDbClient],
      ["product", productDbClient],
      ["advertisements", advertisementsDbClient],
    ] as const;
    let checked = 0;
    for (const [name, client] of databases) {
      const [quick, foreignKeys] = await Promise.all([
        client.execute("PRAGMA quick_check") as Promise<Row[]>,
        client.execute("PRAGMA foreign_key_check") as Promise<Row[]>,
      ]);
      checked += quick.length + foreignKeys.length;
      const quickResult = text(
        quick[0]?.quick_check ?? quick[0]?.integrity_check,
      );
      if (quickResult && quickResult !== "ok") {
        issues.push(
          makeIssue({
            category: "database",
            severity: "critical",
            database: name,
            table: "integrity",
            recordId: name,
            ownerUid: "",
            title: "فشل فحص سلامة قاعدة البيانات",
            details: quickResult,
            evidence: { result: quick },
            cleanupAction: "none",
            cleanupMode: "protected",
          }),
        );
      }
      for (const row of foreignKeys.filter((item) => text(item.table))) {
        issues.push(
          makeIssue({
            category: "database",
            severity: "critical",
            database: name,
            table: text(row.table) || "foreign_key",
            recordId: text(row.rowid) || text(row.parent),
            ownerUid: "",
            title: "مخالفة مفتاح أجنبي",
            details: `table=${text(row.table)}, parent=${text(row.parent)}, fk=${text(row.fkid)}`,
            evidence: { ...row },
            cleanupAction: "none",
            cleanupMode: "protected",
          }),
        );
      }
    }
    const ordersDb = createMarketplaceOrdersDb();
    const [quick, foreignKeys] = await Promise.all([
      ordersDb.execute("PRAGMA quick_check"),
      ordersDb.execute("PRAGMA foreign_key_check"),
    ]);
    checked += quick.length + foreignKeys.length;
    for (const row of foreignKeys.filter((item) => text(item.table))) {
      issues.push(
        makeIssue({
          category: "database",
          severity: "critical",
          database: "orders-core",
          table: text(row.table) || "foreign_key",
          recordId: text(row.rowid) || text(row.parent),
          ownerUid: "",
          title: "مخالفة مفتاح أجنبي في الطلبات",
          details: `table=${text(row.table)}, parent=${text(row.parent)}`,
          evidence: { ...row },
          cleanupAction: "none",
          cleanupMode: "protected",
        }),
      );
    }
    return checked;
  }

  private collectStorageIssues(
    issues: DataHealthIssue[],
    inventory: Awaited<ReturnType<typeof storageInventoryRepository.collect>>,
  ) {
    const referencedPaths = new Set(
      inventory.references.map((item) => item.objectPath),
    );
    for (const item of inventory.references) {
      if (inventory.objectPaths.has(item.objectPath)) continue;
      issues.push(
        makeIssue({
          category: "image",
          severity: "critical",
          database: item.database,
          table: item.table,
          recordId: item.recordId,
          ownerUid: item.ownerUid,
          title: "مرجع صورة بلا ملف في التخزين",
          details: item.objectPath,
          evidence: {
            storageProfileId: item.storageProfileId,
            imageKey: item.imageKey,
            objectPath: item.objectPath,
          },
          cleanupAction:
            item.database === "profile" && item.table === "profile_images"
              ? "quarantine-record"
              : "none",
          // A profile image reference whose object is absent is safe to
          // quarantine: the original binary is already unavailable.
          cleanupMode:
            item.database === "profile" && item.table === "profile_images"
              ? "quarantine"
              : "manual",
          relatedId: item.imageKey,
        }),
      );
    }
    for (const objectPath of inventory.objectPaths) {
      if (referencedPaths.has(objectPath)) continue;
      const updatedAt = inventory.objects.get(objectPath)?.updatedAt ?? "";
      const updatedTimestamp = Date.parse(updatedAt);
      if (
        Number.isFinite(updatedTimestamp) &&
        updatedTimestamp >
          Date.now() - DATA_HEALTH_POLICY.orphanImageGraceHours * 60 * 60 * 1000
      ) {
        continue;
      }
      const profileId = this.profileIdForObjectPath(objectPath);
      const imageKey = this.imageKeyForObjectPath(profileId, objectPath);
      issues.push(
        makeIssue({
          category: "image",
          severity: "warning",
          database: "storage",
          table: "objects",
          recordId: objectPath,
          ownerUid: "",
          title: "ملف صورة بلا مرجع في قواعد البيانات",
          details: objectPath,
          evidence: {
            storageProfileId: profileId,
            imageKey,
            objectPath,
            updatedAt,
            graceHours: DATA_HEALTH_POLICY.orphanImageGraceHours,
          },
          cleanupAction: "quarantine-storage-object",
          cleanupMode: "quarantine",
          relatedId: imageKey,
        }),
      );
    }
    for (const asset of inventory.missingStaticAssets) {
      issues.push(
        makeIssue({
          category: "image",
          severity: "critical",
          database: "static",
          table: "pharmacy_active_ingredients",
          recordId: asset.id,
          ownerUid: "",
          title: "صورة ثابتة مفقودة من كتالوج الصيدلية",
          details: asset.path,
          evidence: { assetPath: asset.path },
          cleanupAction: "none",
          cleanupMode: "protected",
        }),
      );
    }
  }

  private async applyFindingState(issues: DataHealthIssue[]) {
    const [quarantined, previousFindings] = (await Promise.all([
      profileDbClient.execute(
        "SELECT fingerprint FROM data_health_quarantine WHERE COALESCE(released_at, '')='' AND COALESCE(deleted_at, '')=''",
      ),
      profileDbClient.execute(
        "SELECT fingerprint, MIN(first_seen_at) AS first_seen_at FROM data_health_findings GROUP BY fingerprint",
      ),
    ])) as [Row[], Row[]];
    const quarantineSet = new Set(
      quarantined.map((row) => text(row.fingerprint)),
    );
    const firstSeenByFingerprint = new Map(
      previousFindings.map((row) => [
        text(row.fingerprint),
        text(row.first_seen_at),
      ]),
    );
    for (const issue of issues) {
      if (quarantineSet.has(issue.fingerprint)) {
        issue.state = "quarantined";
        continue;
      }
      if (firstSeenByFingerprint.has(issue.fingerprint)) {
        issue.state = "recurring";
      }
    }
    return firstSeenByFingerprint;
  }

  private async persistReport(
    report: DataHealthReport,
    firstSeenByFingerprint: Map<string, string>,
  ) {
    const now = report.generatedAt;
    for (const issue of report.issues) {
      const firstSeenAt = firstSeenByFingerprint.get(issue.fingerprint) || now;
      await profileDbClient.execute(
        "INSERT INTO data_health_findings (id, run_id, fingerprint, category, severity, database_name, table_name, record_id, owner_uid, title, details, evidence_json, cleanup_action, cleanup_mode, snapshot_hash, state, related_id, record_created_at, record_updated_at, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          `${report.runId}:${issue.fingerprint}`,
          report.runId,
          issue.fingerprint,
          issue.category,
          issue.severity,
          issue.database,
          issue.table,
          issue.recordId,
          issue.ownerUid,
          issue.title,
          issue.details,
          JSON.stringify(issue.evidence),
          issue.cleanupAction,
          issue.cleanupMode,
          issue.snapshotHash,
          issue.state,
          issue.relatedId ?? "",
          issue.createdAt ?? "",
          issue.updatedAt ?? "",
          firstSeenAt,
          now,
        ],
      );
    }
    await profileDbClient.execute(
      "UPDATE data_health_runs SET status='completed', completed_at=?, duration_ms=?, scanned_records=?, issue_count=?, critical_count=?, warning_count=?, info_count=?, cleanable_count=?, summary_json=? WHERE id=?",
      [
        report.generatedAt,
        report.durationMs,
        report.scannedRecords,
        report.summary.total,
        report.summary.critical,
        report.summary.warning,
        report.summary.info,
        report.summary.cleanable,
        JSON.stringify(report.summary),
        report.runId,
      ],
    );
  }

  private pushBrokenRelation(
    issues: DataHealthIssue[],
    input: {
      table: string;
      recordId: string;
      ownerUid: string;
      details: string;
      createdAt?: string;
      updatedAt?: string;
    },
  ) {
    issues.push(
      makeIssue({
        category: "relationship",
        severity: "warning",
        database: "profile",
        table: input.table,
        recordId: input.recordId,
        ownerUid: input.ownerUid,
        title: "علاقة مرجعية مكسورة",
        details: input.details,
        evidence: { relation: input.details },
        cleanupAction: "delete-broken-relation",
        cleanupMode: "automatic",
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      }),
    );
  }

  private pushProtectedOrderRelation(
    issues: DataHealthIssue[],
    table: string,
    row: Row,
    ownerUid: string,
  ) {
    issues.push(
      makeIssue({
        category: "order",
        severity: "critical",
        database: orderShardFor(table),
        table,
        recordId: text(row.id),
        ownerUid,
        title: "سجل طلب محمي مرتبط بطرف أو طلب غير موجود",
        details: `order=${text(row.order_id)}, owner=${ownerUid}`,
        evidence: { ...row },
        cleanupAction: "none",
        cleanupMode: "protected",
        createdAt: text(row.created_at),
        updatedAt: text(row.updated_at),
      }),
    );
  }

  private pushInvalidAdvertisementJson(
    issues: DataHealthIssue[],
    table: string,
    row: Row,
  ) {
    issues.push(
      makeIssue({
        category: "advertisement",
        severity: "warning",
        database: "advertisements",
        table,
        recordId: text(row.id),
        ownerUid: "",
        title: "إعداد إعلان بصيغة JSON تالفة",
        details: text(row.config_json ?? row.product_ids_json).slice(0, 500),
        evidence: {
          raw: text(row.config_json ?? row.product_ids_json).slice(0, 500),
        },
        cleanupAction: "none",
        cleanupMode: "manual",
        updatedAt: text(row.updated_at),
      }),
    );
  }

  private profileIdForObjectPath(objectPath: string): string {
    const profile = [...getAllStorageProfiles()]
      .sort(
        (left, right) =>
          Math.max(...storageFolderCandidates(right).map((item) => item.length)) -
          Math.max(...storageFolderCandidates(left).map((item) => item.length)),
      )
      .find(
        (candidate) =>
          storageFolderCandidates(candidate).some(
            (folder) =>
              objectPath === folder || objectPath.startsWith(`${folder}/`),
          ),
      );
    if (!profile)
      throw new Error(`Unregistered storage object path: ${objectPath}`);
    return profile.id;
  }

  private imageKeyForObjectPath(profileId: string, objectPath: string): string {
    const folder = storageFolderCandidates(this.storageProfile(profileId))
      .sort((left, right) => right.length - left.length)
      .find(
        (candidate) =>
          objectPath === candidate || objectPath.startsWith(`${candidate}/`),
      );
    return folder
      ? objectPath.slice(folder.length + 1)
      : objectPath;
  }

  private storageProfile(profileId: string) {
    const profile = getAllStorageProfiles().find(
      (candidate) => candidate.id === profileId,
    );
    if (!profile) throw new Error(`Unknown storage profile: ${profileId}`);
    return profile;
  }

  async executeCleanup(input: {
    planId: string;
    adminUid: string;
    issueIds: string[];
    snapshots: Record<string, string>;
  }): Promise<Omit<DataHealthCleanupResult, "report">> {
    const cleaned: Omit<DataHealthCleanupResult, "report">["cleaned"] = [];
    const skipped: Omit<DataHealthCleanupResult, "report">["skipped"] = [];
    const now = new Date().toISOString();
    const report = await this.scan();
    const current = new Map(report.issues.map((issue) => [issue.id, issue]));

    for (const issueId of input.issueIds) {
      const issue = current.get(issueId);
      let status = "cleaned";
      let reason = "";
      try {
        if (!issue || !issue.canClean)
          throw new Error("issueNoLongerCleanable");
        if (input.snapshots[issueId] !== issue.snapshotHash) {
          throw new Error("issueChangedAfterPlan");
        }
        await this.cleanIssue(issue, input.adminUid, now);
        cleaned.push({
          id: issue.id,
          action: issue.cleanupAction,
          recordId: issue.recordId,
        });
      } catch (error) {
        status = "skipped";
        reason = error instanceof Error ? error.message : String(error);
        skipped.push({ id: issueId, reason });
      }
      await profileDbClient.execute(
        "INSERT INTO data_health_cleanup_audit (id, plan_id, run_id, admin_uid, environment, issue_id, fingerprint, action, record_id, before_json, after_json, status, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          randomUUID(),
          input.planId,
          report.runId,
          input.adminUid,
          resolveDataHealthExecutionContext().environment,
          issueId,
          issue?.fingerprint ?? issueId,
          issue?.cleanupAction ?? "none",
          issue?.recordId ?? "",
          JSON.stringify(issue?.evidence ?? {}),
          "{}",
          status,
          reason,
          now,
        ],
      );
    }
    return { cleanedAt: now, planId: input.planId, cleaned, skipped };
  }

  private async cleanIssue(
    issue: DataHealthIssue,
    adminUid: string,
    now: string,
  ) {
    switch (issue.cleanupAction) {
      case "archive-product": {
        const rows = (await productDbClient.execute(
          "UPDATE products SET status='archived', updated_at=? WHERE id=? AND uid=? AND status<>'archived' RETURNING id",
          [now, issue.recordId, issue.ownerUid],
        )) as Row[];
        if (!resultChanged(rows)) throw new Error("recordChangedOrMissing");
        return;
      }
      case "archive-order": {
        const rows = await createMarketplaceOrdersDb().execute(
          "UPDATE orders SET calculated_status='archived', archived_at=COALESCE(archived_at, ?), updated_at=? WHERE id=? AND archived_at IS NULL RETURNING id",
          [now, now, issue.recordId],
        );
        if (!resultChanged(rows)) throw new Error("recordChangedOrMissing");
        return;
      }
      case "delete-broken-relation":
        await this.deleteBrokenRelation(issue);
        return;
      case "quarantine-record":
      case "quarantine-storage-object":
        await this.quarantine(issue, adminUid, now);
        return;
      case "delete-storage-object":
      case "none":
        throw new Error("issueNotCleanable");
    }
  }

  private async deleteBrokenRelation(issue: DataHealthIssue) {
    const [left, right] = issue.recordId.split("|");
    const definitions: Record<
      string,
      { database: "profile" | "product"; sql: string; params: unknown[] }
    > = {
      profile_featured_products: {
        database: "profile",
        sql: "DELETE FROM profile_featured_products WHERE uid=? AND product_id=? RETURNING uid AS id",
        params: [left, right],
      },
      follows: {
        database: "profile",
        sql: "DELETE FROM follows WHERE id=? RETURNING id",
        params: [issue.recordId],
      },
      profile_delivery_carriers: {
        database: "profile",
        sql: "DELETE FROM profile_delivery_carriers WHERE seller_uid=? AND carrier_uid=? RETURNING seller_uid AS id",
        params: [left, right],
      },
      profile_reviews: {
        database: "profile",
        sql: "DELETE FROM profile_reviews WHERE id=? RETURNING id",
        params: [issue.recordId],
      },
      profile_review_helpful: {
        database: "profile",
        sql: "DELETE FROM profile_review_helpful WHERE review_id=? AND uid=? RETURNING review_id AS id",
        params: [left, right],
      },
      profile_review_replies: {
        database: "profile",
        sql: "DELETE FROM profile_review_replies WHERE id=? RETURNING id",
        params: [issue.recordId],
      },
      product_reviews: {
        database: "product",
        sql: "DELETE FROM product_reviews WHERE id=? RETURNING id",
        params: [issue.recordId],
      },
      product_review_helpful: {
        database: "product",
        sql: "DELETE FROM product_review_helpful WHERE review_id=? AND uid=? RETURNING review_id AS id",
        params: [left, right],
      },
      product_review_replies: {
        database: "product",
        sql: "DELETE FROM product_review_replies WHERE id=? RETURNING id",
        params: [issue.recordId],
      },
    };
    const definition = definitions[issue.table];
    if (!definition) throw new Error("unsupportedCleanupRelation");
    const client =
      definition.database === "profile" ? profileDbClient : productDbClient;
    const rows = (await client.execute(
      definition.sql,
      definition.params,
    )) as Row[];
    if (!resultChanged(rows)) throw new Error("recordChangedOrMissing");
  }

  private async quarantine(
    issue: DataHealthIssue,
    adminUid: string,
    now: string,
  ) {
    const eligible = new Date(
      Date.parse(now) + DATA_HEALTH_POLICY.imageQuarantineDays * 86_400_000,
    ).toISOString();
    const storageProfileId = text(issue.evidence.storageProfileId);
    const resourceKey = text(
      issue.evidence.imageKey ?? issue.evidence.objectPath ?? issue.relatedId,
    );
    await profileDbClient.execute(
      "INSERT INTO data_health_quarantine (id, fingerprint, resource_type, storage_profile_id, resource_key, database_name, table_name, record_id, reason, quarantined_by, quarantined_at, eligible_for_deletion_at, last_verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(fingerprint) DO UPDATE SET resource_type=excluded.resource_type, storage_profile_id=excluded.storage_profile_id, resource_key=excluded.resource_key, database_name=excluded.database_name, table_name=excluded.table_name, record_id=excluded.record_id, reason=excluded.reason, quarantined_by=excluded.quarantined_by, quarantined_at=excluded.quarantined_at, eligible_for_deletion_at=excluded.eligible_for_deletion_at, last_verified_at=excluded.last_verified_at, released_at='', deleted_at=''",
      [
        randomUUID(),
        issue.fingerprint,
        issue.category === "image" ? "image" : "record",
        storageProfileId,
        resourceKey,
        issue.database,
        issue.table,
        issue.recordId,
        issue.details,
        adminUid,
        now,
        eligible,
        now,
      ],
    );
  }
}

export const dataHealthRepository = new DataHealthRepository();
