import "server-only";

import { eq, inArray } from "drizzle-orm";
import { profileDbClient } from "@/core/database/profile-db-client";
import type { IDatabaseClient } from "@/core/database/database-client.interface";
import {
  sellerDiscounts,
  sellerDiscountUsages,
  type SellerDiscountRow,
} from "@/core/database/profile/profile.schema";
import type {
  SaveSellerDiscountInput,
  SellerDiscountRule,
  SellerDiscountStatus,
  SellerDiscountType,
  SellerDiscountUsageSummary,
  SellerDiscountValueType,
} from "../entities/seller-discount.entity";

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function normalizeStatus(value: string): SellerDiscountStatus {
  return value === "draft" ||
    value === "active" ||
    value === "paused" ||
    value === "expired"
    ? value
    : "draft";
}

function normalizeType(value: string): SellerDiscountType {
  return value === "quantity" ||
    value === "bundle" ||
    value === "free_shipping" ||
    value === "coupon" ||
    value === "free_gift" ||
    value === "automatic" ||
    value === "order_total"
    ? value
    : "order_total";
}

function normalizeValueType(value: string): SellerDiscountValueType {
  return value === "percentage" ||
    value === "fixed_amount" ||
    value === "fixed_bundle_price" ||
    value === "free_shipping" ||
    value === "free_gift"
    ? value
    : "percentage";
}

function rowToRule(row: SellerDiscountRow): SellerDiscountRule {
  return {
    id: row.id,
    sellerUid: row.sellerUid,
    type: normalizeType(row.type),
    title: row.title,
    description: row.description,
    status: normalizeStatus(row.status),
    priority: Number(row.priority || 100),
    combinable: Boolean(row.combinable),
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    couponCode: row.couponCode,
    valueType: normalizeValueType(row.valueType),
    value: Number(row.value || 0),
    maxDiscountMinor: Number(row.maxDiscountMinor || 0),
    scope: {
      productIds: parseJsonArray(row.productIdsJson),
      categoryIds: parseJsonArray(row.categoryIdsJson),
      excludedProductIds: parseJsonArray(row.excludedProductIdsJson),
      bundleProductIds: parseJsonArray(row.bundleProductIdsJson),
      giftProductId: row.giftProductId,
    },
    conditions: {
      minSubtotalMinor: Number(row.minSubtotalMinor || 0),
      minQuantity: Number(row.minQuantity || 0),
      buyQuantity: Number(row.buyQuantity || 0),
      getQuantity: Number(row.getQuantity || 0),
      firstOrderOnly: Boolean(row.firstOrderOnly),
      followersOnly: Boolean(row.followersOnly),
      appOnly: Boolean(row.appOnly),
    },
    usageLimits: {
      total: Number(row.usageLimitTotal || 0),
      perBuyer: Number(row.usageLimitPerBuyer || 0),
    },
    metadata: parseJsonObject(row.metadataJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRow(input: SaveSellerDiscountInput, timestamp: string) {
  return {
    id: input.id || createId("discount"),
    sellerUid: input.sellerUid,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.status,
    priority: Math.max(0, Math.floor(input.priority || 100)),
    combinable: input.combinable,
    startsAt: input.startsAt || "",
    endsAt: input.endsAt || "",
    couponCode: input.couponCode.trim(),
    valueType: input.valueType,
    value: Math.max(0, Math.floor(input.value || 0)),
    maxDiscountMinor: Math.max(0, Math.floor(input.maxDiscountMinor || 0)),
    minSubtotalMinor: Math.max(0, Math.floor(input.conditions.minSubtotalMinor || 0)),
    minQuantity: Math.max(0, Math.floor(input.conditions.minQuantity || 0)),
    buyQuantity: Math.max(0, Math.floor(input.conditions.buyQuantity || 0)),
    getQuantity: Math.max(0, Math.floor(input.conditions.getQuantity || 0)),
    usageLimitTotal: Math.max(0, Math.floor(input.usageLimits.total || 0)),
    usageLimitPerBuyer: Math.max(0, Math.floor(input.usageLimits.perBuyer || 0)),
    firstOrderOnly: input.conditions.firstOrderOnly,
    followersOnly: input.conditions.followersOnly,
    appOnly: input.conditions.appOnly,
    productIdsJson: JSON.stringify(input.scope.productIds.filter(Boolean)),
    categoryIdsJson: JSON.stringify(input.scope.categoryIds.filter(Boolean)),
    excludedProductIdsJson: JSON.stringify(
      input.scope.excludedProductIds.filter(Boolean),
    ),
    bundleProductIdsJson: JSON.stringify(input.scope.bundleProductIds.filter(Boolean)),
    giftProductId: input.scope.giftProductId || "",
    metadataJson: JSON.stringify(input.metadata ?? {}),
    updatedAt: timestamp,
  };
}

export class SellerDiscountRepository {
  constructor(private database: IDatabaseClient = profileDbClient) {}

  async listBySeller(sellerUid: string, includeInactive = true) {
    const rows: SellerDiscountRow[] = await this.database.db
      .select()
      .from(sellerDiscounts)
      .where(eq(sellerDiscounts.sellerUid, sellerUid));
    return rows
      .map(rowToRule)
      .filter((rule) => includeInactive || rule.status === "active")
      .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
  }

  async listActiveForSellers(sellerUids: string[]) {
    const unique = Array.from(new Set(sellerUids.filter(Boolean)));
    if (unique.length === 0) return [];
    const rows: SellerDiscountRow[] = await this.database.db
      .select()
      .from(sellerDiscounts)
      .where(inArray(sellerDiscounts.sellerUid, unique));
    return rows.map(rowToRule).filter((rule) => rule.status === "active");
  }

  async replaceSellerDiscounts(sellerUid: string, input: SaveSellerDiscountInput[]) {
    const timestamp = nowIso();
    const rows = input.map((discount) => ({
      ...toRow({ ...discount, sellerUid }, timestamp),
      createdAt: timestamp,
    }));
    await this.database.db
      .delete(sellerDiscounts)
      .where(eq(sellerDiscounts.sellerUid, sellerUid));
    if (rows.length > 0) await this.database.db.insert(sellerDiscounts).values(rows);
    return this.listBySeller(sellerUid, true);
  }

  async getUsageSummary(discountIds: string[], buyerUid = "") {
    const unique = Array.from(new Set(discountIds.filter(Boolean)));
    if (unique.length === 0) return [];
    const rows = (await this.database.execute(
      `SELECT discount_id discountId,
              COUNT(*) totalUses,
              SUM(CASE WHEN buyer_uid = ? THEN 1 ELSE 0 END) buyerUses
       FROM seller_discount_usages
       WHERE discount_id IN (${unique.map(() => "?").join(", ")})
       GROUP BY discount_id`,
      [buyerUid, ...unique],
    )) as SellerDiscountUsageSummary[];
    return rows.map((row) => ({
      discountId: row.discountId,
      totalUses: Number(row.totalUses || 0),
      buyerUses: Number(row.buyerUses || 0),
    }));
  }

  async recordUsage(input: {
    discountId: string;
    sellerUid: string;
    buyerUid?: string;
    orderId?: string;
    discountMinor: number;
  }) {
    await this.database.db.insert(sellerDiscountUsages).values({
      id: createId("discount_usage"),
      discountId: input.discountId,
      sellerUid: input.sellerUid,
      buyerUid: input.buyerUid ?? "",
      orderId: input.orderId ?? "",
      discountMinor: Math.max(0, Math.floor(input.discountMinor)),
      createdAt: nowIso(),
    });
  }
}

export const sellerDiscountRepository = new SellerDiscountRepository();
