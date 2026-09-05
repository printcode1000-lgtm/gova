import "server-only";

import { randomUUID } from "node:crypto";

import { imageStorageOrchestrator } from "@asol/storage-core/server";
import { persistentSystemLogService } from "@/features/system-logs/server";

import { resolveDataHealthExecutionContext } from "../../domain/execution-context.server";
import { assertDataHealthAllowed } from "../../domain/development-guard.server";
import { DATA_HEALTH_POLICY } from "@asol/data-health-core/server";
import type {
  DataHealthOrderPurgePlan,
  DataHealthOrderPurgeResult,
} from "@asol/data-health-core";
import {
  orderPurgeRepository,
  type OrderPurgeSnapshot,
} from "@asol/data-core/data-health";

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function confirmationText(
  environment: "development" | "production",
  count: number,
): string {
  return environment === "production"
    ? `حذف جميع الطلبات (${count}) من الإنتاج`
    : `حذف جميع الطلبات (${count}) من التطوير`;
}

export class OrderPurgeService {
  async createPlan(adminUid: string): Promise<DataHealthOrderPurgePlan> {
    assertDataHealthAllowed();
    const execution = resolveDataHealthExecutionContext();
    const snapshot = await orderPurgeRepository.snapshot();
    if (snapshot.orderCount === 0) throw new Error("dataHealthNoOrdersToPurge");
    const id = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + DATA_HEALTH_POLICY.cleanupPlanTtlMinutes * 60_000,
    ).toISOString();
    const expectedConfirmation = confirmationText(
      execution.environment,
      snapshot.orderCount,
    );
    await orderPurgeRepository.savePlan({
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
      orderCount: snapshot.orderCount,
      tableCounts: snapshot.tableCounts,
      imageCount: snapshot.images.length,
      expiresAt,
      confirmationText: expectedConfirmation,
    };
  }

  async execute(input: {
    adminUid: string;
    planId: string;
    confirmationText: string;
  }): Promise<DataHealthOrderPurgeResult> {
    assertDataHealthAllowed();
    const execution = resolveDataHealthExecutionContext();
    const plan = await orderPurgeRepository.getPlan(input.planId);
    if (!plan || text(plan.adminUid) !== input.adminUid) {
      throw new Error("dataHealthOrderPurgePlanInvalid");
    }
    if (text(plan.consumedAt)) {
      throw new Error("dataHealthOrderPurgePlanConsumed");
    }
    if (Date.parse(text(plan.expiresAt)) <= Date.now()) {
      throw new Error("dataHealthOrderPurgePlanExpired");
    }
    if (text(plan.environment) !== execution.environment) {
      throw new Error("dataHealthEnvironmentChanged");
    }
    if (
      input.confirmationText !== text(plan.confirmationText) ||
      input.confirmationText !==
        confirmationText(execution.environment, number(plan.orderCount))
    ) {
      throw new Error("dataHealthOrderPurgeConfirmationRequired");
    }

    const token = randomUUID();
    const now = new Date().toISOString();
    const acquired = await orderPurgeRepository.acquireLock({
      token,
      adminUid: input.adminUid,
      now,
      lockedUntil: new Date(
        Date.now() + DATA_HEALTH_POLICY.cleanupLockMinutes * 60_000,
      ).toISOString(),
    });
    if (!acquired) throw new Error("dataHealthOrderPurgeBusy");

    let snapshot: OrderPurgeSnapshot | null = null;
    try {
      snapshot = await orderPurgeRepository.snapshot();
      if (
        snapshot.snapshotHash !== text(plan.snapshotHash) ||
        snapshot.orderCount !== number(plan.orderCount)
      ) {
        throw new Error("dataHealthOrderPurgeSelectionChanged");
      }

      const imageResult = await this.deleteImagesImmediately(snapshot.images);

      let deletedRows: Record<string, number>;
      try {
        deletedRows = await orderPurgeRepository.deleteAll(snapshot);
      } catch (error) {
        throw error;
      }

      const completedAt = new Date().toISOString();
      const status: "completed" = "completed";
      await orderPurgeRepository.finishPlan({
        id: input.planId,
        status,
        now: completedAt,
      });
      const result: DataHealthOrderPurgeResult = {
        purgeId: input.planId,
        environment: execution.environment,
        deletedOrders: snapshot.orderCount,
        deletedRows,
        deletedImages: imageResult.deleted,
        pendingImages: 0,
        completedAt,
      };
      await orderPurgeRepository.addAudit({
        purgeId: input.planId,
        adminUid: input.adminUid,
        environment: execution.environment,
        status,
        before: {
          orderCount: snapshot.orderCount,
          tableCounts: snapshot.tableCounts,
          imageCount: snapshot.images.length,
        },
        after: result,
      });
      await persistentSystemLogService.add({
        level: "normal",
        source: "server",
        consoleMethod: "server.info",
        message: `Order purge ${input.planId}: orders=${result.deletedOrders}, images=${result.deletedImages}, pending=${result.pendingImages}`,
        page: "/dev/data-health",
        platform: "server",
        feature: "DataHealth",
        operation: "purge-all-orders",
        routeName: "/api/super-admin/data-health/orders/purge",
        requestMethod: "POST",
        uid: input.adminUid,
      });
      return result;
    } catch (error) {
      const failedAt = new Date().toISOString();
      await orderPurgeRepository.finishPlan({
        id: input.planId,
        status: "failed",
        now: failedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      await orderPurgeRepository.addAudit({
        purgeId: input.planId,
        adminUid: input.adminUid,
        environment: execution.environment,
        status: "failed",
        before: snapshot ?? {},
        after: {},
        reason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await orderPurgeRepository.releaseLock(token);
    }
  }

  async retryPendingImages(): Promise<{ deleted: number; pending: number }> {
    assertDataHealthAllowed();
    await this.reconcilePreparedImages();
    return this.processPendingImages();
  }

  private async reconcilePreparedImages() {
    for (const task of await orderPurgeRepository.preparedStorageTasks()) {
      const stillReferenced = await orderPurgeRepository.imageReferenceExists(
        text(task.storageProfileId),
        text(task.imageKey),
      );
      if (!stillReferenced) {
        await orderPurgeRepository.activateStorageTasks(
          text(task.purgeId),
          new Date().toISOString(),
        );
      }
    }
  }

  private async processPendingImages(
    purgeId?: string,
  ): Promise<{ deleted: number; pending: number }> {
    const tasks = await orderPurgeRepository.pendingStorageTasks(purgeId);
    let deleted = 0;
    let pending = 0;
    for (const task of tasks) {
      const taskId = text(task.id);
      try {
        await imageStorageOrchestrator.deleteByKey(
          text(task.storageProfileId),
          text(task.imageKey),
        );
        await orderPurgeRepository.markStorageTask(
          taskId,
          "deleted",
          new Date().toISOString(),
        );
        deleted += 1;
      } catch (error) {
        await orderPurgeRepository.markStorageTask(
          taskId,
          "pending",
          new Date().toISOString(),
          error instanceof Error ? error.message : String(error),
        );
        pending += 1;
      }
    }
    return { deleted, pending };
  }

  private async deleteImagesImmediately(
    images: OrderPurgeSnapshot["images"],
  ): Promise<{ deleted: number }> {
    let deleted = 0;
    for (const image of images) {
      await imageStorageOrchestrator.deleteByKey(
        image.storageProfileId,
        image.imageKey,
      );
      deleted += 1;
    }
    return { deleted };
  }
}

export const orderPurgeService = new OrderPurgeService();
