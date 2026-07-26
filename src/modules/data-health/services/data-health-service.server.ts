import "server-only";

import { randomUUID } from "node:crypto";

import { persistentSystemLogService } from "@/features/system-logs/services/persistent-system-log-service.server";
import { imageStorageOrchestrator } from "@/core/storage/storage/image-storage-orchestrator.server";

import { cleanupConfirmationText, DATA_HEALTH_POLICY } from "../domain/policy";
import { resolveDataHealthExecutionContext } from "../domain/execution-context.server";
import type {
  DataHealthCleanupPlan,
  DataHealthCleanupResult,
  DataHealthReport,
  DataHealthSchemaComparison,
} from "../domain/types";
import { dataHealthRepository } from "../repositories/data-health.repository.server";
import { schemaComparisonRepository } from "../repositories/schema-comparison.repository.server";

function text(value: unknown): string {
  return String(value ?? "").trim();
}

export class DataHealthService {
  scan(): Promise<DataHealthReport> {
    return dataHealthRepository.scan();
  }

  history() {
    return dataHealthRepository.history();
  }

  compareSchema(): Promise<DataHealthSchemaComparison> {
    return schemaComparisonRepository.compare();
  }

  async deleteQuarantinedImage(input: {
    adminUid: string;
    quarantineId: string;
  }) {
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
    if (input.confirm !== "CLEAR_DATA_HEALTH_QUARANTINE") {
      throw new Error("dataHealthCleanupConfirmationRequired");
    }
    const now = new Date().toISOString();
    const cleared = await dataHealthRepository.clearActiveQuarantine({
      adminUid: input.adminUid,
      clearedAt: now,
    });
    await persistentSystemLogService.add({
      level: "normal",
      source: "server",
      consoleMethod: "server.info",
      message: `Data health quarantine cleared: cleared=${cleared}`,
      page: "/super-admin/data-health",
      platform: "server",
      feature: "DataHealth",
      operation: "clear-quarantine",
      routeName: "/api/super-admin/data-health/quarantine/clear",
      requestMethod: "POST",
      uid: input.adminUid,
    });
    return { clearedAt: now, cleared };
  }

  async createCleanupPlan(input: {
    adminUid: string;
    issueIds: string[];
  }): Promise<DataHealthCleanupPlan> {
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
        page: "/super-admin/data-health",
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
