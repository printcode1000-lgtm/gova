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
import { DataHealthPart9 } from "./data-health.repository.part-09";
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

export abstract class DataHealthPart10 extends DataHealthPart9 {
  protected async collectDatabaseIntegrityIssues(
    issues: DataHealthIssue[],
  ): Promise<number> {
    const databases = [
      { name: "users", client: usersDataSource },
      { name: "product", client: productsDataSource },
      { name: "advertisements", client: advertisementsDataSource },
      ...DATABASE_SHARD_NAMES.map((name) => ({
        name,
        client: new ShardedRawDatabaseClient(
          DATABASE_SHARD_TABLE_TO_DATABASE,
          name,
        ),
      })),
    ];
    let checked = 0;
    for (const { name, client } of databases) {
      let quick: Row[];
      let foreignKeys: Row[];
      try {
        [quick, foreignKeys] = await Promise.all([
          client.execute("PRAGMA quick_check") as Promise<Row[]>,
          client.execute("PRAGMA foreign_key_check") as Promise<Row[]>,
        ]);
      } catch (error) {
        issues.push(
          makeIssue({
            category: "database",
            severity: "warning",
            database: name,
            table: "integrity",
            recordId: name,
            ownerUid: "",
            title: "Database integrity check unavailable",
            details: error instanceof Error ? error.message : String(error),
            evidence: { check: "quick_check_and_foreign_key_check" },
            cleanupAction: "none",
            cleanupMode: "protected",
          }),
        );
        continue;
      }
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
    return checked;
  }

  protected collectStorageIssues(
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

  protected async applyFindingState(issues: DataHealthIssue[]) {
    const [quarantined, previousFindings] = (await Promise.all([
      profilesDataSource.execute(
        "SELECT fingerprint FROM data_health_quarantine WHERE COALESCE(released_at, '')='' AND COALESCE(deleted_at, '')=''",
      ),
      profilesDataSource.execute(
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
        // A quarantined resource has an active retention record. It must not
        // be selectable again from the findings tab and restart that retention.
        issue.canClean = false;
        continue;
      }
      if (firstSeenByFingerprint.has(issue.fingerprint)) {
        issue.state = "recurring";
      }
    }
    return firstSeenByFingerprint;
  }
}
