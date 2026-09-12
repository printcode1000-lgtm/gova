import assert from "node:assert/strict";
import type {
  DatabaseBatchStatement,
  IDatabaseClient,
} from "../../../core/database/database-client.interface";
import { SellerDiscountRepository } from "../repositories/seller-discount-repository";
import { createEmptySellerDiscount } from "../entities";

type Row = Record<string, unknown>;

class FakeDiscountDatabase implements IDatabaseClient {
  db = null;
  readonly batches: DatabaseBatchStatement[][] = [];
  ownershipRows: Row[] = [];
  listRows: Row[] = [];

  async execute(sql: string): Promise<any[]> {
    if (sql.startsWith("SELECT id,seller_uid sellerUid")) return this.ownershipRows;
    if (sql.includes("FROM seller_discounts")) return this.listRows;
    return [];
  }

  async batch(statements: DatabaseBatchStatement[]): Promise<any[][]> {
    this.batches.push(statements);
    return statements.map(() => [{ changes: 1 }]);
  }

  async insert(): Promise<any> { throw new Error("unexpected insert"); }
  async select(): Promise<any[]> { throw new Error("unexpected select"); }
  async update(): Promise<any> { throw new Error("unexpected update"); }
  async delete(): Promise<any> { throw new Error("unexpected delete"); }
}

function persistedRow(id: string, couponCode = "SAVE10") {
  return {
    id,
    sellerUid: "seller-a",
    type: "coupon",
    title: "Save",
    description: "",
    status: "active",
    priority: 100,
    combinable: 0,
    startsAt: "",
    endsAt: "",
    couponCode,
    valueType: "percentage",
    value: 10,
    maxDiscountMinor: 0,
    minSubtotalMinor: 0,
    minQuantity: 0,
    buyQuantity: 0,
    getQuantity: 0,
    usageLimitTotal: 0,
    usageLimitPerBuyer: 0,
    firstOrderOnly: 0,
    followersOnly: 0,
    appOnly: 0,
    productIdsJson: "[]",
    categoryIdsJson: "[]",
    excludedProductIdsJson: "[]",
    bundleProductIdsJson: "[]",
    giftProductId: "",
    metadataJson: "{}",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

const database = new FakeDiscountDatabase();
const repository = new SellerDiscountRepository(database);
const draft = {
  ...createEmptySellerDiscount("seller-a", "coupon"),
  id: "discount-a",
  status: "active" as const,
  title: "Save",
  couponCode: " save10 ",
  valueType: "percentage" as const,
  value: 250,
};
database.listRows = [persistedRow(draft.id)];

const saved = await repository.replaceSellerDiscounts("seller-a", [draft]);
assert.equal(saved[0]?.couponCode, "SAVE10");
assert.equal(database.batches.length, 1, "A seller save must be one atomic database batch.");
const statements = database.batches[0];
assert.equal(statements.length, 2, "One upsert plus one delete-of-removed-rules is expected.");
assert.match(statements[0].sql, /ON CONFLICT\(id\) DO UPDATE/);
assert.doesNotMatch(
  statements[0].sql,
  /created_at\s*=\s*excluded\.created_at/,
  "Updating a discount must preserve its original created_at.",
);
assert.ok(
  statements[0].params?.includes("SAVE10"),
  "Coupon codes must be normalized before persistence.",
);
assert.ok(
  statements[0].params?.includes(100),
  "Malformed percentages must be clamped to 100 before persistence.",
);
assert.match(statements[1].sql, /^DELETE FROM seller_discounts WHERE seller_uid=/);

const duplicateDb = new FakeDiscountDatabase();
const duplicateRepo = new SellerDiscountRepository(duplicateDb);
await assert.rejects(
  () =>
    duplicateRepo.replaceSellerDiscounts("seller-a", [
      { ...draft, id: "one", couponCode: "Save10" },
      { ...draft, id: "two", couponCode: "save10" },
    ]),
  /duplicateSellerCouponCode/,
);
assert.equal(duplicateDb.batches.length, 0, "Duplicate coupons must fail before any write.");

const ownershipDb = new FakeDiscountDatabase();
ownershipDb.ownershipRows = [{ id: "discount-a", sellerUid: "seller-b" }];
const ownershipRepo = new SellerDiscountRepository(ownershipDb);
await assert.rejects(
  () => ownershipRepo.replaceSellerDiscounts("seller-a", [draft]),
  /forbidden/,
);
assert.equal(ownershipDb.batches.length, 0, "A seller must not overwrite another seller's rule id.");

console.log("seller-discount-repository: atomic save, normalization, uniqueness and ownership guards passed");
