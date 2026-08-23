import { advertisementsDataSource, productsDataSource, profilesDataSource, usersDataSource } from "../../../../core/data-source-registry";
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

export abstract class DataHealthPart1 {
  protected metadataReady = false;

  protected async ensureMetadata() {
    if (this.metadataReady) return;
    for (const statement of DATA_HEALTH_METADATA_STATEMENTS) {
      await profilesDataSource.execute(statement);
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
    await profilesDataSource.execute(
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
    const rows = (await profilesDataSource.execute(
      "SELECT id, admin_uid, environment, issue_ids_json, snapshots_json, expires_at, consumed_at FROM data_health_cleanup_plans WHERE id=? LIMIT 1",
      [planId],
    )) as Row[];
    return rows[0];
  }

  async consumeCleanupPlan(planId: string, consumedAt: string) {
    await this.ensureMetadata();
    await profilesDataSource.execute(
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
    const rows = (await profilesDataSource.execute(
      "INSERT INTO data_health_locks (id, token, owner_uid, locked_until, created_at) VALUES ('cleanup', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET token=excluded.token, owner_uid=excluded.owner_uid, locked_until=excluded.locked_until, created_at=excluded.created_at WHERE data_health_locks.locked_until < ? RETURNING token",
      [input.token, input.adminUid, input.lockedUntil, input.now, input.now],
    )) as Row[];
    return text(rows[0]?.token) === input.token;
  }

  async releaseCleanupLock(token: string) {
    await this.ensureMetadata();
    await profilesDataSource.execute(
      "DELETE FROM data_health_locks WHERE id='cleanup' AND token=?",
      [token],
    );
  }

  abstract scan(): Promise<DataHealthReport>;

  protected abstract collectTopology(inventory: Awaited<ReturnType<typeof storageInventoryRepository.collect>>, runtime: DataHealthReport["execution"]["runtime"]): Promise<DataHealthTopology>;

  abstract history(): Promise<{
    runs: DataHealthHistoryEntry[];
    audit: DataHealthAuditEntry[];
    quarantine: DataHealthQuarantineEntry[];
}>;

  abstract clearRunHistory(): Promise<{
    runs: number;
    findings: number;
}>;

  abstract clearCleanupAudit(): Promise<{
    audit: number;
}>;

  abstract getQuarantineEntry(id: string): Promise<Row | undefined>;

  abstract listActiveQuarantineEntries(): Promise<Row[]>;

  abstract markQuarantineDeleted(id: string, deletedAt: string): any;

  abstract deleteQuarantineEntry(id: string): any;

  abstract releaseQuarantine(id: string, releasedAt: string): any;

  abstract clearActiveQuarantine(input: {
    adminUid: string;
    clearedAt: string;
}): Promise<number>;

  abstract resetQuarantinedFindings(updatedAt: string): any;

  abstract getQuarantinedOriginalCleanupTarget(entry: Row): Promise<QuarantinedOriginalCleanupResult>;

  abstract deleteQuarantinedOriginalRecord(entry: Row): Promise<number>;

  abstract addManualAudit(input: {
    adminUid: string;
    action: string;
    recordId: string;
    fingerprint: string;
    status: string;
    reason?: string;
}): any;

  protected abstract insertRun(runId: string, startedAt: string): any;

  protected abstract collectProductIssues(issues: DataHealthIssue[], products: Row[], context: ScanContext): any;

  protected abstract collectOrderHeaderIssues(issues: DataHealthIssue[], orders: Row[], sellerOrders: Row[], customItems: Row[], context: ScanContext): any;

  protected abstract collectProfileIssues(issues: DataHealthIssue[], context: ScanContext): Promise<number>;

  protected abstract collectProductRelationIssues(issues: DataHealthIssue[], context: ScanContext): Promise<number>;

  protected abstract collectOrderRelationIssues(issues: DataHealthIssue[], context: ScanContext): Promise<number>;

  protected abstract collectAdvertisementIssues(issues: DataHealthIssue[], context: ScanContext): Promise<number>;

  protected abstract collectDatabaseIntegrityIssues(issues: DataHealthIssue[]): Promise<number>;

  protected abstract collectStorageIssues(issues: DataHealthIssue[], inventory: Awaited<ReturnType<typeof storageInventoryRepository.collect>>): any;

  protected abstract applyFindingState(issues: DataHealthIssue[]): any;

  protected abstract persistReport(report: DataHealthReport, firstSeenByFingerprint: Map<string, string>): any;

  protected abstract pushBrokenRelation(issues: DataHealthIssue[], input: {
    table: string;
    recordId: string;
    ownerUid: string;
    details: string;
    createdAt?: string;
    updatedAt?: string;
}): any;

  protected abstract pushProtectedOrderRelation(issues: DataHealthIssue[], table: string, row: Row, ownerUid: string): any;

  protected abstract pushInvalidAdvertisementJson(issues: DataHealthIssue[], table: string, row: Row): any;

  protected abstract profileIdForObjectPath(objectPath: string): string;

  protected abstract imageKeyForObjectPath(profileId: string, objectPath: string): string;

  protected abstract storageProfile(profileId: string): any;

  abstract executeCleanup(input: {
    planId: string;
    adminUid: string;
    issueIds: string[];
    snapshots: Record<string, string>;
}): Promise<Omit<DataHealthCleanupResult, "report">>;

  protected abstract cleanIssue(issue: DataHealthIssue, adminUid: string, now: string): any;

  protected abstract deleteBrokenRelation(issue: DataHealthIssue): any;

  protected abstract quarantine(issue: DataHealthIssue, adminUid: string, now: string): any;
}
