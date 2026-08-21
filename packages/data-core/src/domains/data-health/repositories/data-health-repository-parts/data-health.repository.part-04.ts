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
import { DataHealthPart3 } from "./data-health.repository.part-03";
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

export abstract class DataHealthPart4 extends DataHealthPart3 {
  async clearRunHistory(): Promise<{ runs: number; findings: number }> {
    await this.ensureMetadata();
    const findingRows = (await profilesDataSource.execute(
      "DELETE FROM data_health_findings RETURNING id",
    )) as Row[];
    const runRows = (await profilesDataSource.execute(
      "DELETE FROM data_health_runs RETURNING id",
    )) as Row[];
    return { runs: runRows.length, findings: findingRows.length };
  }

  async clearCleanupAudit(): Promise<{ audit: number }> {
    await this.ensureMetadata();
    const rows = (await profilesDataSource.execute(
      "DELETE FROM data_health_cleanup_audit RETURNING id",
    )) as Row[];
    return { audit: rows.length };
  }

  async getQuarantineEntry(id: string): Promise<Row | undefined> {
    await this.ensureMetadata();
    const rows = (await profilesDataSource.execute(
      "SELECT id, fingerprint, resource_type, storage_profile_id, resource_key, database_name, table_name, record_id, eligible_for_deletion_at, released_at, deleted_at FROM data_health_quarantine WHERE id=? LIMIT 1",
      [id],
    )) as Row[];
    return rows[0];
  }

  async listActiveQuarantineEntries(): Promise<Row[]> {
    await this.ensureMetadata();
    return (await profilesDataSource.execute(
      "SELECT id, fingerprint, resource_type, storage_profile_id, resource_key, database_name, table_name, record_id, eligible_for_deletion_at, released_at, deleted_at FROM data_health_quarantine WHERE COALESCE(released_at, '')='' AND COALESCE(deleted_at, '')='' ORDER BY quarantined_at ASC",
    )) as Row[];
  }

  async markQuarantineDeleted(id: string, deletedAt: string) {
    await this.ensureMetadata();
    const rows = (await profilesDataSource.execute(
      "UPDATE data_health_quarantine SET deleted_at=?, last_verified_at=? WHERE id=? AND COALESCE(released_at, '')='' AND COALESCE(deleted_at, '')='' RETURNING id",
      [deletedAt, deletedAt, id],
    )) as Row[];
    if (!resultChanged(rows)) throw new Error("quarantineChangedOrMissing");
  }

  async deleteQuarantineEntry(id: string) {
    await this.ensureMetadata();
    const rows = (await profilesDataSource.execute(
      "DELETE FROM data_health_quarantine WHERE id=? RETURNING id",
      [id],
    )) as Row[];
    if (!resultChanged(rows)) throw new Error("quarantineChangedOrMissing");
  }

  async releaseQuarantine(id: string, releasedAt: string) {
    await this.ensureMetadata();
    const rows = (await profilesDataSource.execute(
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
    const rows = (await profilesDataSource.execute(
      "DELETE FROM data_health_quarantine RETURNING id",
    )) as Row[];
    const cleared = rows.length;
    await profilesDataSource.execute(
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
    await profilesDataSource.execute(
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
    const storageObjects: Array<{
      storageProfileId: string;
      imageKey: string;
    }> = [];
    if (!database || !table || !id) {
      return { deletedRecords: 0, storageObjects };
    }

    if (database === "profile" && table === "profile_images") {
      const rows = (await profilesDataSource.execute(
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
      const rows = (await profilesDataSource.execute(
        "SELECT uid FROM user_profiles WHERE uid=? LIMIT 1",
        [id],
      )) as Row[];
      return { deletedRecords: rows.length, storageObjects };
    }

    if (
      database === "product" &&
      table === "pharmacy_profile_product_overrides"
    ) {
      const rows = (await productsDataSource.execute(
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
      const deleted = (await profilesDataSource.execute(
        "DELETE FROM profile_images WHERE id=? RETURNING id",
        [id],
      )) as Row[];
      return deleted.length;
    }

    if (database === "profile" && table === "user_profiles") {
      const deleted = (await profilesDataSource.execute(
        "DELETE FROM user_profiles WHERE uid=? RETURNING uid AS id",
        [id],
      )) as Row[];
      return deleted.length;
    }

    if (
      database === "product" &&
      table === "pharmacy_profile_product_overrides"
    ) {
      const deleted = (await productsDataSource.execute(
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
}
