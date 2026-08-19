import "server-only";

import { randomUUID } from "node:crypto";

import { persistentSystemLogService } from "@/features/system-logs/services/persistent-system-log-service.server";
import { imageStorageOrchestrator } from "@asol/storage-core/server";

import { cleanupConfirmationText, DATA_HEALTH_POLICY } from "../domain/policy";
import { assertDataHealthAllowed } from "../domain/development-guard.server";
import { resolveDataHealthExecutionContext } from "../domain/execution-context.server";
import type {
  DataHealthCleanupPlan,
  DataHealthCleanupResult,
  DataHealthReport,
  DataHealthSchemaComparison,
} from "../domain/types";
import { dataHealthRepository } from "@asol/data-core/data-health";
import { schemaComparisonRepository } from "@asol/data-core/data-health";

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function quarantineEntryResourceType(entry: Record<string, unknown>) {
  if (
    text(entry.resource_type) === "record" ||
    (text(entry.database_name) === "profile" &&
      text(entry.table_name) === "profile_images")
  ) {
    return "record" as const;
  }
  return "image" as const;
}

export class DataHealthService {
  scan(): Promise<DataHealthReport> {
    assertDataHealthAllowed();
    return dataHealthRepository.scan();
  }

  history() {
    assertDataHealthAllowed();
    return dataHealthRepository.history();
  }

  compareSchema(): Promise<DataHealthSchemaComparison> {
    assertDataHealthAllowed();
    return schemaComparisonRepository.compare();
  }

  async deleteQuarantinedImage(input: {
    adminUid: string;
    quarantineId: string;
  }) {
    assertDataHealthAllowed();
    const entry = await dataHealthRepository.getQuarantineEntry(
      input.quarantineId,
    );
    if (
      !entry ||
      text(entry.released_at) ||
      text(entry.deleted_at) ||
      text(entry.resource_type) !== "image"
    ) {
      throw new Error("dataHealthQuarantineInvalid");
    }
    if (Date.parse(text(entry.eligible_for_deletion_at)) > Date.now()) {
      throw new Error("dataHealthQuarantineNotEligible");
    }
    const report = await dataHealthRepository.scan();
    const finding = report.issues.find(
      (issue) =>
        issue.fingerprint === text(entry.fingerprint) &&
        issue.cleanupAction === "quarantine-storage-object",
    );
    if (!finding) throw new Error("dataHealthQuarantineNoLongerOrphan");
    await imageStorageOrchestrator.deleteByKey(
      text(entry.storage_profile_id),
      text(entry.resource_key),
    );
    const now = new Date().toISOString();
    await dataHealthRepository.markQuarantineDeleted(input.quarantineId, now);
    await dataHealthRepository.addManualAudit({
      adminUid: input.adminUid,
      action: "delete-storage-object",
      recordId: text(entry.resource_key),
      fingerprint: text(entry.fingerprint),
      status: "cleaned",
    });
    return { deletedAt: now, report: await dataHealthRepository.scan() };
  }

  async releaseQuarantine(input: { adminUid: string; quarantineId: string }) {
    assertDataHealthAllowed();
    const entry = await dataHealthRepository.getQuarantineEntry(
      input.quarantineId,
    );
    if (!entry || text(entry.released_at) || text(entry.deleted_at)) {
      throw new Error("dataHealthQuarantineInvalid");
    }
    const now = new Date().toISOString();
    await dataHealthRepository.releaseQuarantine(input.quarantineId, now);
    await dataHealthRepository.addManualAudit({
      adminUid: input.adminUid,
      action: "release-quarantine",
      recordId: text(entry.resource_key) || input.quarantineId,
      fingerprint: text(entry.fingerprint),
      status: "cleaned",
    });
    return { releasedAt: now };
  }

  async clearQuarantine(input: { adminUid: string; confirm: string }) {
    assertDataHealthAllowed();
    if (input.confirm !== "CLEAR_DATA_HEALTH_QUARANTINE") {
      throw new Error("dataHealthCleanupConfirmationRequired");
    }
    const now = new Date().toISOString();
    const entries = await dataHealthRepository.listActiveQuarantineEntries();
    let cleared = 0;
    let deletedStorageObjects = 0;
    let deletedRecords = 0;
    const skipped: Array<{ id: string; reason: string }> = [];

    for (const entry of entries) {
      const id = text(entry.id);
      const fingerprint = text(entry.fingerprint);
      const resourceType = quarantineEntryResourceType(entry);
      const recordId = text(entry.record_id) || text(entry.resource_key) || id;
      try {
        if (resourceType === "image") {
          await imageStorageOrchestrator.deleteByKey(
            text(entry.storage_profile_id),
            text(entry.resource_key),
          );
          deletedStorageObjects += 1;
        } else if (resourceType === "record") {
          const target =
            await dataHealthRepository.getQuarantinedOriginalCleanupTarget(
              entry,
            );
          for (const storageObject of target.storageObjects) {
            await imageStorageOrchestrator.deleteByKey(
              storageObject.storageProfileId,
              storageObject.imageKey,
            );
            deletedStorageObjects += 1;
          }
          deletedRecords +=
            await dataHealthRepository.deleteQuarantinedOriginalRecord(entry);
        } else {
          throw new Error(`unsupportedQuarantineResource:${resourceType}`);
        }

        await dataHealthRepository.deleteQuarantineEntry(id);
        await dataHealthRepository.addManualAudit({
          adminUid: input.adminUid,
          action:
            resourceType === "image"
              ? "delete-storage-object"
              : "delete-quarantined-record",
          recordId,
          fingerprint,
          status: "cleaned",
          reason: `storage=${deletedStorageObjects}, records=${deletedRecords}`,
        });
        cleared += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        skipped.push({ id, reason });
        await dataHealthRepository.addManualAudit({
          adminUid: input.adminUid,
          action: "clear-quarantine",
          recordId,
          fingerprint,
          status: "skipped",
          reason,
        });
      }
    }
    if (cleared > 0) {
      await dataHealthRepository.resetQuarantinedFindings(now);
    }
    await persistentSystemLogService.add({
      level: "normal",
      source: "server",
      consoleMethod: "server.info",
      message: `Data health quarantine cleared: cleared=${cleared}, storage=${deletedStorageObjects}, records=${deletedRecords}, skipped=${skipped.length}`,
      page: "/dev/data-health",
      platform: "server",
      feature: "DataHealth",
      operation: "clear-quarantine",
      routeName: "/api/super-admin/data-health/quarantine/clear",
      requestMethod: "POST",
      uid: input.adminUid,
    });
    return {
      clearedAt: now,
      cleared,
      deletedStorageObjects,
      deletedRecords,
      skipped,
    };
  }

  async clearRunHistory(input: { adminUid: string; confirm: string }) {
    assertDataHealthAllowed();
    if (input.confirm !== "CLEAR_DATA_HEALTH_RUN_HISTORY") {
      throw new Error("dataHealthCleanupConfirmationRequired");
    }
    const clearedAt = new Date().toISOString();
    const result = await dataHealthRepository.clearRunHistory();
    await persistentSystemLogService.add({
      level: "normal",
      source: "server",
      consoleMethod: "server.info",
      message: `Data health run history cleared: runs=${result.runs}, findings=${result.findings}`,
      page: "/dev/data-health",
      platform: "server",
      feature: "DataHealth",
      operation: "clear-run-history",
      routeName: "/api/super-admin/data-health/history/runs/clear",
      requestMethod: "POST",
      uid: input.adminUid,
    });
    return { clearedAt, ...result };
  }

  async clearCleanupAudit(input: { adminUid: string; confirm: string }) {
    assertDataHealthAllowed();
    if (input.confirm !== "CLEAR_DATA_HEALTH_CLEANUP_AUDIT") {
      throw new Error("dataHealthCleanupConfirmationRequired");
    }
    const clearedAt = new Date().toISOString();
    const result = await dataHealthRepository.clearCleanupAudit();
    await persistentSystemLogService.add({
      level: "normal",
      source: "server",
      consoleMethod: "server.info",
      message: `Data health cleanup audit cleared: audit=${result.audit}`,
      page: "/dev/data-health",
      platform: "server",
      feature: "DataHealth",
      operation: "clear-cleanup-audit",
      routeName: "/api/super-admin/data-health/history/audit/clear",
      requestMethod: "POST",
      uid: input.adminUid,
    });
    return { clearedAt, ...result };
  }

  async createCleanupPlan(input: {
    adminUid: string;
    issueIds: string[];
  }): Promise<DataHealthCleanupPlan> {
    assertDataHealthAllowed();
    const issueIds = [
      ...new Set(input.issueIds.map((id) => id.trim()).filter(Boolean)),
    ];
    if (issueIds.length === 0) throw new Error("dataHealthSelectionRequired");
    if (issueIds.length > DATA_HEALTH_POLICY.maxCleanupItems) {
      throw new Error("dataHealthSelectionTooLarge");
    }

    const report = await dataHealthRepository.scan();
    const issueMap = new Map(report.issues.map((issue) => [issue.id, issue]));
    const selected = issueIds.map((id) => issueMap.get(id));
    if (
      selected.some((issue) => !issue || !issue.canClean) ||
      selected.length !== issueIds.length
    ) {
      throw new Error("dataHealthSelectionChanged");
    }

    const id = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + DATA_HEALTH_POLICY.cleanupPlanTtlMinutes * 60_000,
    ).toISOString();
    const snapshots = Object.fromEntries(
      selected.map((issue) => [issue!.id, issue!.snapshotHash]),
    );
    await dataHealthRepository.saveCleanupPlan({
      id,
      adminUid: input.adminUid,
      environment: report.environment,
      runId: report.runId,
      issueIds,
      snapshots,
      createdAt: createdAt.toISOString(),
      expiresAt,
    });

    return {
      id,
      runId: report.runId,
      environment: report.environment,
      issueIds,
      expiresAt,
      confirmationText: cleanupConfirmationText(
        report.environment,
        issueIds.length,
      ),
      preview: selected.map((issue) => ({
        issueId: issue!.id,
        title: issue!.title,
        action: issue!.cleanupAction,
        cleanupMode: issue!.cleanupMode,
      })),
    };
  }

  async cleanup(input: {
    adminUid: string;
    planId: string;
    confirmationText: string;
  }): Promise<DataHealthCleanupResult> {
    assertDataHealthAllowed();
    const plan = await dataHealthRepository.getCleanupPlan(input.planId);
    if (!plan || text(plan.admin_uid) !== input.adminUid) {
      throw new Error("dataHealthPlanInvalid");
    }
    if (text(plan.consumed_at)) throw new Error("dataHealthPlanConsumed");
    if (Date.parse(text(plan.expires_at)) <= Date.now()) {
      throw new Error("dataHealthPlanExpired");
    }
    const environment = resolveDataHealthExecutionContext().environment;
    if (text(plan.environment) !== environment) {
      throw new Error("dataHealthEnvironmentChanged");
    }

    const issueIds = JSON.parse(text(plan.issue_ids_json)) as string[];
    if (
      input.confirmationText !==
      cleanupConfirmationText(environment, issueIds.length)
    ) {
      throw new Error("dataHealthCleanupConfirmationRequired");
    }
    const snapshots = JSON.parse(text(plan.snapshots_json)) as Record<
      string,
      string
    >;
    const lockToken = await this.acquireCleanupLock(input.adminUid);
    try {
      const result = await dataHealthRepository.executeCleanup({
        planId: input.planId,
        adminUid: input.adminUid,
        issueIds,
        snapshots,
      });
      await dataHealthRepository.consumeCleanupPlan(
        input.planId,
        result.cleanedAt,
      );
      const report = await dataHealthRepository.scan();
      await persistentSystemLogService.add({
        level: result.skipped.length > 0 ? "warning" : "normal",
        source: "server",
        consoleMethod:
          result.skipped.length > 0 ? "server.warn" : "server.info",
        message: `Data health cleanup plan ${input.planId}: cleaned=${result.cleaned.length}, skipped=${result.skipped.length}`,
        page: "/dev/data-health",
        platform: "server",
        feature: "DataHealth",
        operation: "cleanup",
        routeName: "/api/super-admin/data-health/cleanup",
        requestMethod: "POST",
        uid: input.adminUid,
      });
      return { ...result, report };
    } finally {
      await this.releaseCleanupLock(lockToken);
    }
  }

  private async acquireCleanupLock(adminUid: string): Promise<string> {
    const token = randomUUID();
    const now = new Date().toISOString();
    const lockedUntil = new Date(
      Date.now() + DATA_HEALTH_POLICY.cleanupLockMinutes * 60_000,
    ).toISOString();
    const acquired = await dataHealthRepository.acquireCleanupLock({
      token,
      adminUid,
      lockedUntil,
      now,
    });
    if (!acquired) throw new Error("dataHealthCleanupBusy");
    return token;
  }

  private async releaseCleanupLock(token: string) {
    await dataHealthRepository.releaseCleanupLock(token);
  }
}

export const dataHealthService = new DataHealthService();
