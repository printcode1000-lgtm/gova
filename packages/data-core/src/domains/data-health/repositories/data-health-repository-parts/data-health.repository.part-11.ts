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
import { DataHealthPart10 } from "./data-health.repository.part-10";
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

export abstract class DataHealthPart11 extends DataHealthPart10 {
  protected async persistReport(
    report: DataHealthReport,
    firstSeenByFingerprint: Map<string, string>,
  ) {
    const now = report.generatedAt;
    for (const issue of report.issues) {
      const firstSeenAt = firstSeenByFingerprint.get(issue.fingerprint) || now;
      await profilesDataSource.execute(
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
    await profilesDataSource.execute(
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

  protected pushBrokenRelation(
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

  protected pushProtectedOrderRelation(
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

  protected pushInvalidAdvertisementJson(
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

  protected profileIdForObjectPath(objectPath: string): string {
    const profile = [...getAllStorageProfiles()]
      .sort(
        (left, right) =>
          Math.max(
            ...storageFolderCandidates(right).map((item) => item.length),
          ) -
          Math.max(...storageFolderCandidates(left).map((item) => item.length)),
      )
      .find((candidate) =>
        storageFolderCandidates(candidate).some(
          (folder) =>
            objectPath === folder || objectPath.startsWith(`${folder}/`),
        ),
      );
    if (!profile)
      throw new Error(`Unregistered storage object path: ${objectPath}`);
    return profile.id;
  }

  protected imageKeyForObjectPath(profileId: string, objectPath: string): string {
    const folder = storageFolderCandidates(this.storageProfile(profileId))
      .sort((left, right) => right.length - left.length)
      .find(
        (candidate) =>
          objectPath === candidate || objectPath.startsWith(`${candidate}/`),
      );
    return folder ? objectPath.slice(folder.length + 1) : objectPath;
  }

  protected storageProfile(profileId: string) {
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
      await profilesDataSource.execute(
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
}
