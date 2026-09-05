import { profilesDataSource } from "../../../core";
import "server-only";

import { randomUUID } from "node:crypto";

import { createMarketplaceOrdersDb } from "../../marketplace-orders/db/client";
import type { MarketplaceDb } from "../../marketplace-orders/ports/marketplace-order-store";

import { DATA_HEALTH_METADATA_STATEMENTS } from "../db/metadata-schema";
import { stableHash } from "@asol/data-health-core/server";
import type { DataHealthOrderPurgePlanRecordDto, DataHealthStorageDeletionTaskDto } from "@asol/data-health-core";
import { mapOrderPurgePlanRow, mapStorageDeletionTaskRow } from "./data-health-record-mappers";

type Row = Record<string, unknown>;

export interface OrderOwnedImage {
  storageProfileId: string;
  imageKey: string;
}

export interface OrderPurgeSnapshot {
  orderCount: number;
  tableCounts: Record<string, number>;
  ownedTables: string[];
  images: OrderOwnedImage[];
  snapshotHash: string;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export class OrderPurgeRepository {
  private metadataReady?: Promise<void>;

  private ensureMetadata(): Promise<void> {
    if (!this.metadataReady) {
      this.metadataReady = (async () => {
        for (const statement of DATA_HEALTH_METADATA_STATEMENTS) {
          await profilesDataSource.execute(statement);
        }
      })().catch((error) => {
        this.metadataReady = undefined;
        throw error;
      });
    }
    return this.metadataReady;
  }

  async snapshot(
    db = createMarketplaceOrdersDb(),
  ): Promise<OrderPurgeSnapshot> {
    const tableRows = await db.execute(
      "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    );
    const tables = tableRows.map((row) => text(row.name)).filter(Boolean);
    const parentsByTable = new Map<string, Set<string>>();
    const hasOrderId = new Set<string>();

    for (const table of tables) {
      const [foreignKeys, columns] = await Promise.all([
        db.execute(`PRAGMA foreign_key_list(${quoteIdentifier(table)})`),
        db.execute(`PRAGMA table_info(${quoteIdentifier(table)})`),
      ]);
      parentsByTable.set(
        table,
        new Set(foreignKeys.map((row) => text(row.table)).filter(Boolean)),
      );
      if (columns.some((row) => text(row.name) === "order_id")) {
        hasOrderId.add(table);
      }
    }

    const owned = new Set<string>(["orders", ...hasOrderId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [table, parents] of parentsByTable) {
        if (owned.has(table)) continue;
        if ([...parents].some((parent) => owned.has(parent))) {
          owned.add(table);
          changed = true;
        }
      }
    }

    const depthMemo = new Map<string, number>();
    const depth = (table: string, visiting = new Set<string>()): number => {
      if (depthMemo.has(table)) return depthMemo.get(table)!;
      if (visiting.has(table)) return 0;
      const nextVisiting = new Set(visiting).add(table);
      const parentDepths = [...(parentsByTable.get(table) ?? [])]
        .filter((parent) => owned.has(parent))
        .map((parent) => depth(parent, nextVisiting) + 1);
      const result = parentDepths.length ? Math.max(...parentDepths) : 0;
      depthMemo.set(table, result);
      return result;
    };
    const ownedTables = [...owned]
      .filter((table) => tables.includes(table))
      .sort(
        (left, right) =>
          depth(right) - depth(left) || left.localeCompare(right),
      );

    const tableCounts: Record<string, number> = {};
    for (const table of ownedTables) {
      const rows = await db.execute(
        `SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`,
      );
      tableCounts[table] = number(rows[0]?.count);
    }

    const imageRows = tables.includes("custom_request_images")
      ? await db.execute(
          "SELECT storage_profile_id, image_key FROM custom_request_images WHERE image_key<>''",
        )
      : [];
    const imageMap = new Map<string, OrderOwnedImage>();
    for (const row of imageRows) {
      const storageProfileId = text(row.storage_profile_id) || "spicialOrder";
      const imageKey = text(row.image_key);
      if (!imageKey) continue;
      imageMap.set(`${storageProfileId}:${imageKey}`, {
        storageProfileId,
        imageKey,
      });
    }
    const images = [...imageMap.values()].sort((left, right) =>
      `${left.storageProfileId}:${left.imageKey}`.localeCompare(
        `${right.storageProfileId}:${right.imageKey}`,
      ),
    );
    const orderCount = tableCounts.orders ?? 0;
    return {
      orderCount,
      tableCounts,
      ownedTables,
      images,
      snapshotHash: stableHash({ tableCounts, images }),
    };
  }

  async savePlan(input: {
    id: string;
    adminUid: string;
    environment: string;
    snapshot: OrderPurgeSnapshot;
    confirmationText: string;
    createdAt: string;
    expiresAt: string;
  }) {
    await this.ensureMetadata();
    await profilesDataSource.execute(
      "INSERT INTO data_health_order_purge_plans (id, admin_uid, environment, order_count, table_counts_json, images_json, snapshot_hash, confirmation_text, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        input.id,
        input.adminUid,
        input.environment,
        input.snapshot.orderCount,
        JSON.stringify(input.snapshot.tableCounts),
        JSON.stringify(input.snapshot.images),
        input.snapshot.snapshotHash,
        input.confirmationText,
        input.createdAt,
        input.expiresAt,
      ],
    );
  }

  async getPlan(id: string): Promise<DataHealthOrderPurgePlanRecordDto | null> {
    await this.ensureMetadata();
    const rows = (await profilesDataSource.execute(
      "SELECT * FROM data_health_order_purge_plans WHERE id=? LIMIT 1",
      [id],
    )) as Row[];
    return rows[0] ? mapOrderPurgePlanRow(rows[0]) : null;
  }

  async createStorageTasks(
    purgeId: string,
    images: OrderOwnedImage[],
    now: string,
  ) {
    await this.ensureMetadata();
    for (const image of images) {
      await profilesDataSource.execute(
        "INSERT OR IGNORE INTO data_health_storage_deletion_tasks (id, purge_id, storage_profile_id, image_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'prepared', ?, ?)",
        [
          randomUUID(),
          purgeId,
          image.storageProfileId,
          image.imageKey,
          now,
          now,
        ],
      );
    }
  }

  async deleteAll(
    snapshot: OrderPurgeSnapshot,
    db = createMarketplaceOrdersDb(),
  ): Promise<Record<string, number>> {
    return db.transaction(async (transaction) => {
      const deletedRows: Record<string, number> = {};
      for (const table of snapshot.ownedTables) {
        const result = await transaction.execute(
          `DELETE FROM ${quoteIdentifier(table)}`,
        );
        deletedRows[table] = number(result[0]?.changes);
      }
      const remaining = await transaction.execute(
        "SELECT COUNT(*) AS count FROM orders",
      );
      if (number(remaining[0]?.count) !== 0) {
        throw new Error("dataHealthOrderPurgeIncomplete");
      }
      return deletedRows;
    });
  }

  async pendingStorageTasks(purgeId?: string): Promise<DataHealthStorageDeletionTaskDto[]> {
    await this.ensureMetadata();
    const rows = (await profilesDataSource.execute(
      purgeId
        ? "SELECT * FROM data_health_storage_deletion_tasks WHERE purge_id=? AND status='pending' ORDER BY created_at"
        : "SELECT * FROM data_health_storage_deletion_tasks WHERE status='pending' ORDER BY created_at",
      purgeId ? [purgeId] : [],
    )) as Row[];
    return rows.map(mapStorageDeletionTaskRow);
  }

  async preparedStorageTasks(purgeId?: string): Promise<DataHealthStorageDeletionTaskDto[]> {
    await this.ensureMetadata();
    const rows = (await profilesDataSource.execute(
      purgeId
        ? "SELECT * FROM data_health_storage_deletion_tasks WHERE purge_id=? AND status='prepared' ORDER BY created_at"
        : "SELECT * FROM data_health_storage_deletion_tasks WHERE status='prepared' ORDER BY created_at",
      purgeId ? [purgeId] : [],
    )) as Row[];
    return rows.map(mapStorageDeletionTaskRow);
  }

  async activateStorageTasks(purgeId: string, now: string) {
    await this.ensureMetadata();
    await profilesDataSource.execute(
      "UPDATE data_health_storage_deletion_tasks SET status='pending', updated_at=? WHERE purge_id=? AND status='prepared'",
      [now, purgeId],
    );
  }

  async imageReferenceExists(
    storageProfileId: string,
    imageKey: string,
  ): Promise<boolean> {
    const rows = await createMarketplaceOrdersDb().execute(
      "SELECT 1 AS found FROM custom_request_images WHERE storage_profile_id=? AND image_key=? LIMIT 1",
      [storageProfileId, imageKey],
    );
    return rows.length > 0;
  }

  async markStorageTask(
    id: string,
    status: "deleted" | "pending" | "cancelled",
    now: string,
    error = "",
  ) {
    await profilesDataSource.execute(
      "UPDATE data_health_storage_deletion_tasks SET status=?, attempts=attempts+1, last_error=?, updated_at=?, deleted_at=CASE WHEN ?='deleted' THEN ? ELSE deleted_at END WHERE id=?",
      [status, error, now, status, now, id],
    );
  }

  async finishPlan(input: {
    id: string;
    status: "completed" | "partial" | "failed";
    now: string;
    error?: string;
  }) {
    await this.ensureMetadata();
    await profilesDataSource.execute(
      "UPDATE data_health_order_purge_plans SET status=?, consumed_at=?, error_message=? WHERE id=?",
      [input.status, input.now, input.error ?? "", input.id],
    );
  }

  async acquireLock(input: {
    token: string;
    adminUid: string;
    now: string;
    lockedUntil: string;
  }): Promise<boolean> {
    await this.ensureMetadata();
    const rows = (await profilesDataSource.execute(
      "INSERT INTO data_health_locks (id, token, owner_uid, locked_until, created_at) VALUES ('order-purge', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET token=excluded.token, owner_uid=excluded.owner_uid, locked_until=excluded.locked_until, created_at=excluded.created_at WHERE data_health_locks.locked_until<=? RETURNING token",
      [input.token, input.adminUid, input.lockedUntil, input.now, input.now],
    )) as Row[];
    return text(rows[0]?.token) === input.token;
  }

  async releaseLock(token: string) {
    await profilesDataSource.execute(
      "DELETE FROM data_health_locks WHERE id='order-purge' AND token=?",
      [token],
    );
  }

  async addAudit(input: {
    purgeId: string;
    adminUid: string;
    environment: string;
    status: string;
    before: unknown;
    after: unknown;
    reason?: string;
  }) {
    await this.ensureMetadata();
    await profilesDataSource.execute(
      "INSERT INTO data_health_cleanup_audit (id, plan_id, run_id, admin_uid, environment, issue_id, fingerprint, action, record_id, before_json, after_json, status, reason, created_at) VALUES (?, ?, '', ?, ?, ?, ?, 'purge-all-orders', 'all-orders', ?, ?, ?, ?, ?)",
      [
        randomUUID(),
        input.purgeId,
        input.adminUid,
        input.environment,
        input.purgeId,
        input.purgeId,
        JSON.stringify(input.before),
        JSON.stringify(input.after),
        input.status,
        input.reason ?? "",
        new Date().toISOString(),
      ],
    );
  }
}

export const orderPurgeRepository = new OrderPurgeRepository();
