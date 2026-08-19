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
import { DATA_HEALTH_METADATA_STATEMENTS } from "../../db/metadata-schema";
import { storageInventoryRepository } from "../storage-inventory.repository.server";
import { DataHealthPart6 } from "./data-health.repository.part-06";
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

export abstract class DataHealthPart7 extends DataHealthPart6 {
  protected async collectProfileIssues(
    issues: DataHealthIssue[],
    context: ScanContext,
  ): Promise<number> {
    const [
      images,
      featured,
      follows,
      carriers,
      reviews,
      helpful,
      replies,
      usages,
    ] = await Promise.all([
      profilesDataSource.execute(
        "SELECT id, uid, image_key, image_type, created_at, updated_at FROM profile_images",
      ) as Promise<Row[]>,
      profilesDataSource.execute(
        "SELECT uid, product_id, created_at FROM profile_featured_products",
      ) as Promise<Row[]>,
      profilesDataSource.execute(
        "SELECT id, follower_uid, target_type, target_id, target_owner_uid, created_at FROM follows",
      ) as Promise<Row[]>,
      profilesDataSource.execute(
        "SELECT seller_uid, carrier_uid, created_at, updated_at FROM profile_delivery_carriers",
      ) as Promise<Row[]>,
      profilesDataSource.execute(
        "SELECT id, target_uid, uid, created_at, updated_at FROM profile_reviews",
      ) as Promise<Row[]>,
      profilesDataSource.execute(
        "SELECT review_id, uid, created_at FROM profile_review_helpful",
      ) as Promise<Row[]>,
      profilesDataSource.execute(
        "SELECT id, review_id, seller_uid, created_at, updated_at FROM profile_review_replies",
      ) as Promise<Row[]>,
      profilesDataSource.execute(
        "SELECT id, discount_id, seller_uid, buyer_uid, order_id, created_at FROM seller_discount_usages",
      ) as Promise<Row[]>,
    ]);
    const reviewIds = new Set(reviews.map((row) => text(row.id)));

    for (const uid of context.profiles) {
      if (!context.users.has(uid)) {
        issues.push(
          makeIssue({
            category: "profile",
            severity: "critical",
            database: "profile",
            table: "user_profiles",
            recordId: uid,
            ownerUid: uid,
            title: "بروفايل بلا مستخدم مالك",
            details: `لا يوجد مستخدم نشط بالمعرف ${uid}.`,
            evidence: { uid },
            cleanupAction: "quarantine-record",
            cleanupMode: "quarantine",
            route: routeFor("profile", "user_profiles", uid),
          }),
        );
      }
    }

    for (const row of images) {
      const uid = text(row.uid);
      if (
        !context.users.has(uid) ||
        !context.profiles.has(uid) ||
        !text(row.image_key)
      ) {
        issues.push(
          makeIssue({
            category: "image",
            severity: "critical",
            database: "profile",
            table: "profile_images",
            recordId: text(row.id),
            ownerUid: uid,
            title: "سجل صورة بروفايل بلا مالك أو مفتاح صالح",
            details: `uid=${uid || "empty"}, imageKey=${text(row.image_key) || "empty"}`,
            evidence: {
              uid,
              imageKey: text(row.image_key),
              imageType: text(row.image_type),
            },
            cleanupAction: "quarantine-record",
            cleanupMode: "quarantine",
            relatedId: text(row.image_key),
            createdAt: text(row.created_at),
            updatedAt: text(row.updated_at),
          }),
        );
      }
    }

    for (const row of featured) {
      if (
        !context.profiles.has(text(row.uid)) ||
        !context.products.has(text(row.product_id))
      ) {
        this.pushBrokenRelation(issues, {
          table: "profile_featured_products",
          recordId: `${text(row.uid)}|${text(row.product_id)}`,
          ownerUid: text(row.uid),
          details: `uid=${text(row.uid)}, product=${text(row.product_id)}`,
          createdAt: text(row.created_at),
        });
      }
    }

    for (const row of follows) {
      const follower = text(row.follower_uid);
      const owner = text(row.target_owner_uid);
      const targetType = text(row.target_type);
      const targetId = text(row.target_id);
      const targetExists =
        targetType === "profile"
          ? context.profiles.has(targetId)
          : targetType === "product"
            ? context.products.has(targetId)
            : false;
      if (
        !context.users.has(follower) ||
        (owner && !context.users.has(owner)) ||
        !targetExists
      ) {
        this.pushBrokenRelation(issues, {
          table: "follows",
          recordId: text(row.id),
          ownerUid: follower,
          details: `follower=${follower}, target=${targetType}:${targetId}, owner=${owner}`,
          createdAt: text(row.created_at),
        });
      }
    }

    for (const row of carriers) {
      if (
        !context.profiles.has(text(row.seller_uid)) ||
        !context.users.has(text(row.carrier_uid))
      ) {
        this.pushBrokenRelation(issues, {
          table: "profile_delivery_carriers",
          recordId: `${text(row.seller_uid)}|${text(row.carrier_uid)}`,
          ownerUid: text(row.seller_uid),
          details: `seller=${text(row.seller_uid)}, carrier=${text(row.carrier_uid)}`,
          createdAt: text(row.created_at),
          updatedAt: text(row.updated_at),
        });
      }
    }

    for (const row of reviews) {
      if (
        !context.profiles.has(text(row.target_uid)) ||
        !context.users.has(text(row.uid))
      ) {
        this.pushBrokenRelation(issues, {
          table: "profile_reviews",
          recordId: text(row.id),
          ownerUid: text(row.uid),
          details: `target=${text(row.target_uid)}, reviewer=${text(row.uid)}`,
          createdAt: text(row.created_at),
          updatedAt: text(row.updated_at),
        });
      }
    }
    for (const row of helpful) {
      if (
        !reviewIds.has(text(row.review_id)) ||
        !context.users.has(text(row.uid))
      ) {
        this.pushBrokenRelation(issues, {
          table: "profile_review_helpful",
          recordId: `${text(row.review_id)}|${text(row.uid)}`,
          ownerUid: text(row.uid),
          details: `review=${text(row.review_id)}, uid=${text(row.uid)}`,
          createdAt: text(row.created_at),
        });
      }
    }
    for (const row of replies) {
      if (
        !reviewIds.has(text(row.review_id)) ||
        !context.users.has(text(row.seller_uid))
      ) {
        this.pushBrokenRelation(issues, {
          table: "profile_review_replies",
          recordId: text(row.id),
          ownerUid: text(row.seller_uid),
          details: `review=${text(row.review_id)}, seller=${text(row.seller_uid)}`,
          createdAt: text(row.created_at),
          updatedAt: text(row.updated_at),
        });
      }
    }
    for (const row of usages) {
      const buyer = text(row.buyer_uid);
      if (
        !context.users.has(text(row.seller_uid)) ||
        (buyer && !context.users.has(buyer)) ||
        (text(row.order_id) && !context.orders.has(text(row.order_id)))
      ) {
        issues.push(
          makeIssue({
            category: "discount",
            severity: "warning",
            database: "profile",
            table: "seller_discount_usages",
            recordId: text(row.id),
            ownerUid: text(row.seller_uid),
            title: "استخدام خصم مرتبط بطرف أو طلب غير موجود",
            details: `seller=${text(row.seller_uid)}, buyer=${buyer}, order=${text(row.order_id)}`,
            evidence: { ...row },
            cleanupAction: "none",
            cleanupMode: "protected",
            createdAt: text(row.created_at),
          }),
        );
      }
    }
    return (
      images.length +
      featured.length +
      follows.length +
      carriers.length +
      reviews.length +
      helpful.length +
      replies.length +
      usages.length
    );
  }
}
