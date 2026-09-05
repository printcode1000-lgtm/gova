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
import { DATA_HEALTH_IMAGE_SOURCES } from "../../db/image-source-registry";
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
import { DataHealthPart11 } from "./data-health.repository.part-11";
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

export class DataHealthPart12 extends DataHealthPart11 {
  protected async cleanIssue(
    issue: DataHealthIssue,
    adminUid: string,
    now: string,
  ) {
    switch (issue.cleanupAction) {
      case "archive-product": {
        const rows = (await productsDataSource.execute(
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

  protected async deleteBrokenRelation(issue: DataHealthIssue) {
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
      definition.database === "profile" ? profilesDataSource : productsDataSource;
    const rows = (await client.execute(
      definition.sql,
      definition.params,
    )) as Row[];
    if (!resultChanged(rows)) throw new Error("recordChangedOrMissing");
  }

  protected async quarantine(
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
    await profilesDataSource.execute(
      "INSERT INTO data_health_quarantine (id, fingerprint, resource_type, storage_profile_id, resource_key, database_name, table_name, record_id, reason, quarantined_by, quarantined_at, eligible_for_deletion_at, last_verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(fingerprint) DO UPDATE SET resource_type=excluded.resource_type, storage_profile_id=excluded.storage_profile_id, resource_key=excluded.resource_key, database_name=excluded.database_name, table_name=excluded.table_name, record_id=excluded.record_id, reason=excluded.reason, quarantined_by=excluded.quarantined_by, quarantined_at=excluded.quarantined_at, eligible_for_deletion_at=excluded.eligible_for_deletion_at, last_verified_at=excluded.last_verified_at, released_at='', deleted_at=''",
      [
        randomUUID(),
        issue.fingerprint,
        quarantineResourceType(issue.cleanupAction),
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
