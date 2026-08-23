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
import { DataHealthPart2 } from "./data-health.repository.part-02";
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

export abstract class DataHealthPart3 extends DataHealthPart2 {
  protected async collectTopology(
    inventory: Awaited<ReturnType<typeof storageInventoryRepository.collect>>,
    runtime: DataHealthReport["execution"]["runtime"],
  ): Promise<DataHealthTopology> {
    const coreDatabases = [
      { id: "users", client: usersDataSource },
      { id: "product", client: productsDataSource },
      { id: "advertisements", client: advertisementsDataSource },
    ] as const;
    const coreChecks = await Promise.all(
      coreDatabases.map(async ({ id, client }) => {
        try {
          await client.execute("SELECT 1 AS connection_check");
          const tables = (await client.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
          )) as Row[];
          return {
            id,
            kind: "core" as const,
            tables: tables.map((row) => text(row.name)).filter(Boolean),
            status: "ready" as const,
          };
        } catch (error) {
          return {
            id,
            kind: "core" as const,
            tables: [],
            status: "unavailable" as const,
            message:
              error instanceof Error
                ? error.message
                : "Connection check failed",
          };
        }
      }),
    );
    const shardChecks = await Promise.all(
      DATABASE_SHARD_NAMES.map(async (id) => {
        try {
          const client = new ShardedRawDatabaseClient(
            DATABASE_SHARD_TABLE_TO_DATABASE,
            id,
          );
          await client.execute("SELECT 1 AS connection_check");
          return {
            id,
            kind:
              id.startsWith("profile-") || id === "system-ops"
                ? ("profile-shard" as const)
                : ("order-shard" as const),
            tables: [...DATABASE_SHARDS[id]],
            status: "ready" as const,
          };
        } catch (error) {
          return {
            id,
            kind:
              id.startsWith("profile-") || id === "system-ops"
                ? ("profile-shard" as const)
                : ("order-shard" as const),
            tables: [...DATABASE_SHARDS[id]],
            status: "unavailable" as const,
            message:
              error instanceof Error
                ? error.message
                : "Connection check failed",
          };
        }
      }),
    );
    const profiles = getAllStorageProfiles().filter(
      (profile) => profile.enabled,
    );
    const storage: DataHealthTopology["storage"] = (
      [
        {
          id: "r2-primary",
          kind: "primary-r2" as const,
          provider: "CloudflareR2",
        },
        {
          id: "r2-products",
          kind: "product-r2" as const,
          provider: "CloudflareR2Products",
        },
        {
          id: "r2-products-apparel-pets",
          kind: "product-apparel-pets-r2" as const,
          provider: "CloudflareR2_products-apparel-pets",
        },
      ] as const
    ).map((store) => {
      const assigned = profiles.filter(
        (profile) => profile.provider === store.provider,
      );
      const profileIds = assigned.map((profile) => profile.id);
      const warnings = inventory.warnings.filter((warning) =>
        profileIds.some((profileId) => warning.startsWith(`${profileId}:`)),
      );
      const folders = new Set(
        assigned
          .map((profile) => profile.cloudFolder)
          .filter((folder): folder is string => Boolean(folder)),
      );
      const referencedObjects = inventory.references.filter((reference) =>
        profileIds.includes(reference.storageProfileId),
      ).length;
      const discoveredObjects = [...inventory.objectPaths].filter(
        (objectPath) =>
          [...folders].some(
            (folder) =>
              objectPath === folder || objectPath.startsWith(`${folder}/`),
          ),
      ).length;
      return {
        id: store.id,
        kind: store.kind,
        provider: store.provider,
        profiles: profileIds,
        cloudFolders: [...folders],
        localFolders: [...new Set(assigned.map((profile) => profile.folder))],
        referencedObjects,
        discoveredObjects,
        status: warnings.length > 0 ? ("warning" as const) : ("ready" as const),
        message: warnings.length > 0 ? warnings.join(" | ") : undefined,
      };
    });
    storage.push({
      id: "local-sync-mirror",
      kind: "local-mirror",
      provider: "public/sync_data/sync_file",
      profiles: profiles.map((profile) => profile.id),
      cloudFolders: [],
      localFolders: [...new Set(profiles.map((profile) => profile.folder))],
      referencedObjects: inventory.references.length,
      discoveredObjects:
        runtime === "development-local" ? inventory.objectPaths.size : 0,
      status: runtime === "development-local" ? "ready" : "not-applicable",
      message:
        runtime === "development-local"
          ? undefined
          : "The local mirror is not mounted in cloud runtime.",
    });
    return {
      databases: [...coreChecks, ...shardChecks],
      storage,
      imageSources: DATA_HEALTH_IMAGE_SOURCES.map((source) => ({
        database: source.database,
        table: source.table,
        columns: [...source.columns],
        ownership: source.ownership,
        storageProfileId:
          "defaultStorageProfileId" in source
            ? source.defaultStorageProfileId
            : undefined,
      })),
    };
  }

  async history(): Promise<{
    runs: DataHealthHistoryEntry[];
    audit: DataHealthAuditEntry[];
    quarantine: DataHealthQuarantineEntry[];
  }> {
    await this.ensureMetadata();
    const [runs, audit, quarantine] = await Promise.all([
      profilesDataSource.execute(
        "SELECT id, environment, status, started_at, completed_at, duration_ms, scanned_records, issue_count, critical_count, warning_count, info_count, cleanable_count FROM data_health_runs ORDER BY started_at DESC LIMIT ?",
        [DATA_HEALTH_POLICY.historyLimit],
      ) as Promise<Row[]>,
      profilesDataSource.execute(
        "SELECT id, plan_id, admin_uid, environment, issue_id, action, record_id, status, reason, created_at FROM data_health_cleanup_audit ORDER BY created_at DESC LIMIT 100",
      ) as Promise<Row[]>,
      profilesDataSource.execute(
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
}
