import "server-only";

import { randomUUID } from "node:crypto";

import { getAllStorageProfiles } from "@/core/storage/profiles/storage-profile-loader.server";
import {
  resolveActiveProviderId,
  resolveStorageProvider,
} from "@/core/storage/providers/provider-resolver.server";
import { storageFolderForProvider } from "@/core/storage/storage/storage-profile-path";
import {
  SUPER_ADMIN_PHONE,
  SUPER_ADMIN_UID,
} from "@/features/auth/utils/super-admin";
import { verifyPassword } from "@/features/auth/utils/password-hash.server";
import { persistentSystemLogService } from "@/features/system-logs/services/persistent-system-log-service.server";

import { resolveDataHealthExecutionContext } from "../domain/execution-context.server";
import { DATA_HEALTH_POLICY } from "../domain/policy";
import type {
  DataHealthFactoryResetPlan,
  DataHealthFactoryResetResult,
} from "../domain/types";
import {
  factoryResetRepository,
  FACTORY_RESET_DOMAINS,
  type FactoryResetSnapshot,
} from "@/modules/data-access/domains/data-health/index.server";

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeEgyptianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("20") && digits.length === 12
    ? digits.slice(2)
    : digits;
}

function confirmationText(
  environment: "development" | "production",
  totalRows: number,
  imageCount: number,
): string {
  return environment === "production"
    ? `إعادة ضبط المصنع الكاملة لكل البيانات (${totalRows} سجل) وكل الصور (${imageCount}) من الإنتاج`
    : `إعادة ضبط المصنع الكاملة لكل البيانات (${totalRows} سجل) وكل الصور (${imageCount}) من التطوير`;
}

export class FactoryResetService {
  async createPlan(adminUid: string): Promise<DataHealthFactoryResetPlan> {
    const execution = resolveDataHealthExecutionContext();
    const imageCount = await this.countAllStorageObjects();
    const snapshot = await factoryResetRepository.snapshot(imageCount);
    const id = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + DATA_HEALTH_POLICY.cleanupPlanTtlMinutes * 60_000,
    ).toISOString();
    const expectedConfirmation = confirmationText(
      execution.environment,
      snapshot.totalRows,
      imageCount,
    );
    await factoryResetRepository.savePlan({
      id,
      adminUid,
      environment: execution.environment,
      snapshot,
      confirmationText: expectedConfirmation,
      createdAt: createdAt.toISOString(),
      expiresAt,
    });
    return {
      id,
      environment: execution.environment,
      databaseSource: execution.databaseSource,
      storageSource: execution.storageSource,
      domainCount: FACTORY_RESET_DOMAINS.length,
      domainCounts: snapshot.domainCounts,
      totalRows: snapshot.totalRows,
      imageCount,
      expiresAt,
      confirmationText: expectedConfirmation,
    };
  }

  async execute(input: {
    adminUid: string;
    planId: string;
    confirmationText: string;
    currentPassword: string;
  }): Promise<DataHealthFactoryResetResult> {
    const execution = resolveDataHealthExecutionContext();
    const plan = await factoryResetRepository.getPlan(input.planId);
    if (!plan || text(plan.admin_uid) !== input.adminUid) {
      throw new Error("dataHealthFactoryResetPlanInvalid");
    }
    if (text(plan.consumed_at)) {
      throw new Error("dataHealthFactoryResetPlanConsumed");
    }
    if (Date.parse(text(plan.expires_at)) <= Date.now()) {
      throw new Error("dataHealthFactoryResetPlanExpired");
    }
    if (text(plan.environment) !== execution.environment) {
      throw new Error("dataHealthEnvironmentChanged");
    }
    if (
      input.confirmationText !== text(plan.confirmation_text) ||
      input.confirmationText !==
        confirmationText(
          execution.environment,
          number(plan.total_rows),
          number(plan.image_count),
        )
    ) {
      throw new Error("dataHealthFactoryResetConfirmationRequired");
    }

    if (!input.currentPassword) {
      throw new Error("dataHealthFactoryResetPasswordRequired");
    }
    const passwordHash = await factoryResetRepository.getSuperAdminPasswordHash(
      SUPER_ADMIN_UID,
    );
    if (
      !passwordHash ||
      !(await verifyPassword(input.currentPassword, passwordHash))
    ) {
      throw new Error("dataHealthFactoryResetPasswordInvalid");
    }

    if (await factoryResetRepository.isOrderPurgeLockHeld()) {
      throw new Error("dataHealthFactoryResetBusy");
    }

    const token = randomUUID();
    const now = new Date().toISOString();
    const acquired = await factoryResetRepository.acquireLock({
      token,
      adminUid: input.adminUid,
      now,
      lockedUntil: new Date(
        Date.now() + DATA_HEALTH_POLICY.cleanupLockMinutes * 60_000,
      ).toISOString(),
    });
    if (!acquired) throw new Error("dataHealthFactoryResetBusy");

    let snapshot: FactoryResetSnapshot | null = null;
    try {
      const imageCount = await this.countAllStorageObjects();
      snapshot = await factoryResetRepository.snapshot(imageCount);
      if (
        snapshot.snapshotHash !== text(plan.snapshot_hash) ||
        snapshot.totalRows !== number(plan.total_rows)
      ) {
        throw new Error("dataHealthFactoryResetSelectionChanged");
      }

      const imageResult = await this.deleteAllImages();

      const deletedRowsByDomain: Record<string, Record<string, number>> = {};
      const domainErrors: Record<string, string> = {};
      const nonUsersDomains = FACTORY_RESET_DOMAINS.filter(
        (domain) => domain !== "users" && domain !== "system-ops",
      );
      for (const domain of nonUsersDomains) {
        const result = await factoryResetRepository.wipeDomain(domain);
        deletedRowsByDomain[domain] = result.deletedRows;
        if (result.status === "failed" && result.error) {
          domainErrors[domain] = result.error;
        }
      }
      const systemOpsResult = await factoryResetRepository.wipeDomain(
        "system-ops",
      );
      deletedRowsByDomain["system-ops"] = systemOpsResult.deletedRows;
      if (systemOpsResult.status === "failed" && systemOpsResult.error) {
        domainErrors["system-ops"] = systemOpsResult.error;
      }

      const usersAuxResult = await factoryResetRepository.wipeDomain("users");
      deletedRowsByDomain["users"] = usersAuxResult.deletedRows;
      if (usersAuxResult.status === "failed" && usersAuxResult.error) {
        domainErrors["users"] = usersAuxResult.error;
      }

      try {
        const remainingUsers = await factoryResetRepository.resetSuperAdminRow(
          SUPER_ADMIN_UID,
        );
        const ok =
          remainingUsers.length === 1 &&
          text(remainingUsers[0]?.uid) === SUPER_ADMIN_UID &&
          normalizeEgyptianPhone(text(remainingUsers[0]?.phone)) ===
            SUPER_ADMIN_PHONE;
        if (!ok) {
          throw new Error("dataHealthFactoryResetUsersInvariantFailed");
        }
      } catch (error) {
        domainErrors["users-table"] =
          error instanceof Error ? error.message : String(error);
      }

      try {
        await factoryResetRepository.reseedAdvertisements();
      } catch (error) {
        domainErrors["advertisements-reseed"] =
          error instanceof Error ? error.message : String(error);
      }

      const completedAt = new Date().toISOString();
      const status: "completed" | "partial" =
        Object.keys(domainErrors).length === 0 ? "completed" : "partial";
      await factoryResetRepository.finishPlan({
        id: input.planId,
        status,
        now: completedAt,
      });
      const result: DataHealthFactoryResetResult = {
        resetId: input.planId,
        environment: execution.environment,
        deletedRowsByDomain,
        domainErrors,
        deletedImages: imageResult.deleted,
        failedImages: imageResult.failed,
        completedAt,
      };
      await factoryResetRepository.addAudit({
        resetId: input.planId,
        adminUid: input.adminUid,
        environment: execution.environment,
        status,
        before: {
          totalRows: snapshot.totalRows,
          domainCounts: snapshot.domainCounts,
          imageCount: snapshot.imageCount,
        },
        after: result,
      });
      await persistentSystemLogService.add({
        level: "normal",
        source: "server",
        consoleMethod: "server.info",
        message: `Factory reset ${input.planId}: rows=${snapshot.totalRows}, images=${result.deletedImages}, failedImages=${result.failedImages}, status=${status}`,
        page: "/super-admin/data-health",
        platform: "server",
        feature: "DataHealth",
        operation: "factory-reset",
        routeName: "/api/super-admin/data-health/factory-reset/execute",
        requestMethod: "POST",
        uid: input.adminUid,
      });
      return result;
    } catch (error) {
      const failedAt = new Date().toISOString();
      await factoryResetRepository.finishPlan({
        id: input.planId,
        status: "failed",
        now: failedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      await factoryResetRepository.addAudit({
        resetId: input.planId,
        adminUid: input.adminUid,
        environment: execution.environment,
        status: "failed",
        before: snapshot ?? {},
        after: {},
        reason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await factoryResetRepository.releaseLock(token);
    }
  }

  private async countAllStorageObjects(): Promise<number> {
    let count = 0;
    for (const profile of getAllStorageProfiles().filter((p) => p.enabled)) {
      try {
        const provider = resolveStorageProvider(profile.provider);
        const activeProviderId = resolveActiveProviderId(profile.provider);
        const folder = storageFolderForProvider(profile, activeProviderId);
        const objects = await provider.list(folder);
        count += objects.length;
      } catch {
        // Best-effort count for the plan preview; execution re-lists per profile.
      }
    }
    return count;
  }

  private async deleteAllImages(): Promise<{
    deleted: number;
    failed: number;
  }> {
    let deleted = 0;
    let failed = 0;
    for (const profile of getAllStorageProfiles().filter((p) => p.enabled)) {
      const provider = resolveStorageProvider(profile.provider);
      const activeProviderId = resolveActiveProviderId(profile.provider);
      const folder = storageFolderForProvider(profile, activeProviderId);
      let objects: Array<{ path: string }>;
      try {
        objects = await provider.list(folder);
      } catch {
        continue;
      }
      for (const object of objects) {
        try {
          await provider.delete(object.path);
          deleted += 1;
        } catch {
          failed += 1;
        }
      }
    }
    return { deleted, failed };
  }
}

export const factoryResetService = new FactoryResetService();
