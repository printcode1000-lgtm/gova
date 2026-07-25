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
  private schemaReady = false;

  constructor(private database: IDatabaseClient = profileDbClient) {}

  private async ensureSchema() {
    if (this.schemaReady) return;
    await this.database.execute(`
      CREATE TABLE IF NOT EXISTS seller_discounts (
        id text PRIMARY KEY NOT NULL,
        seller_uid text NOT NULL REFERENCES user_profiles(uid) ON DELETE CASCADE,
        type text NOT NULL,
        title text NOT NULL DEFAULT '',
        description text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'active',
        priority integer NOT NULL DEFAULT 100,
        combinable integer NOT NULL DEFAULT 0,
        starts_at text NOT NULL DEFAULT '',
        ends_at text NOT NULL DEFAULT '',
        coupon_code text NOT NULL DEFAULT '',
        value_type text NOT NULL DEFAULT 'percentage',
        value integer NOT NULL DEFAULT 0,
        max_discount_minor integer NOT NULL DEFAULT 0,
        min_subtotal_minor integer NOT NULL DEFAULT 0,
        min_quantity integer NOT NULL DEFAULT 0,
        buy_quantity integer NOT NULL DEFAULT 0,
        get_quantity integer NOT NULL DEFAULT 0,
        usage_limit_total integer NOT NULL DEFAULT 0,
        usage_limit_per_buyer integer NOT NULL DEFAULT 0,
        first_order_only integer NOT NULL DEFAULT 0,
        followers_only integer NOT NULL DEFAULT 0,
        app_only integer NOT NULL DEFAULT 0,
        product_ids_json text NOT NULL DEFAULT '[]',
        category_ids_json text NOT NULL DEFAULT '[]',
        excluded_product_ids_json text NOT NULL DEFAULT '[]',
        bundle_product_ids_json text NOT NULL DEFAULT '[]',
        gift_product_id text NOT NULL DEFAULT '',
        metadata_json text NOT NULL DEFAULT '{}',
        created_at text NOT NULL,
        updated_at text NOT NULL
      )
    `);
    await this.database.execute(
      "CREATE INDEX IF NOT EXISTS seller_discounts_seller_status_idx ON seller_discounts(seller_uid, status)",
    );
    await this.database.execute(
      "CREATE INDEX IF NOT EXISTS seller_discounts_coupon_idx ON seller_discounts(seller_uid, coupon_code)",
    );
    await this.database.execute(`
      CREATE TABLE IF NOT EXISTS seller_discount_usages (
        id text PRIMARY KEY NOT NULL,
        discount_id text NOT NULL REFERENCES seller_discounts(id) ON DELETE CASCADE,
        seller_uid text NOT NULL,
        buyer_uid text NOT NULL DEFAULT '',
        order_id text NOT NULL DEFAULT '',
        discount_minor integer NOT NULL DEFAULT 0,
        created_at text NOT NULL
      )
    `);
    await this.database.execute(
      "CREATE INDEX IF NOT EXISTS seller_discount_usages_discount_idx ON seller_discount_usages(discount_id)",
    );
    await this.database.execute(
      "CREATE INDEX IF NOT EXISTS seller_discount_usages_buyer_idx ON seller_discount_usages(discount_id, buyer_uid)",
    );
    this.schemaReady = true;
  }

  async listBySeller(sellerUid: string, includeInactive = true) {
    await this.ensureSchema();
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
    await this.ensureSchema();
    const unique = Array.from(new Set(sellerUids.filter(Boolean)));
    if (unique.length === 0) return [];
    const rows: SellerDiscountRow[] = await this.database.db
      .select()
      .from(sellerDiscounts)
      .where(inArray(sellerDiscounts.sellerUid, unique));
    return rows.map(rowToRule).filter((rule) => rule.status === "active");
  }

  async replaceSellerDiscounts(sellerUid: string, input: SaveSellerDiscountInput[]) {
    await this.ensureSchema();
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
    await this.ensureSchema();
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
    await this.ensureSchema();
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
