import assert from "node:assert/strict";

import type { UserProfileRow } from "@/features/profile";
import { createSellerCardViewModel } from "./seller-card-presenter";

function sellerRow(overrides: Record<string, unknown> = {}): UserProfileRow {
  return {
    uid: "seller-registration-uid",
    storeName: "",
    storeDescription: "",
    storeStory: "",
    ...overrides,
  } as unknown as UserProfileRow;
}

assert.equal(
  createSellerCardViewModel(
    sellerRow({
      storeName: "متجر النور",
      registrationPhone: "+201000000001",
    }),
  ).identityLabel,
  "متجر النور",
  "store alias must win over the original registration phone",
);

assert.equal(
  createSellerCardViewModel(
    sellerRow({ registrationPhone: "+201000000002" }),
  ).identityLabel,
  "+201000000002",
  "original registration phone must be shown when the store alias is absent",
);

assert.equal(
  createSellerCardViewModel(
    sellerRow({
      storeName: "   ",
      registrationPhone: "+201000000003",
    }),
  ).identityLabel,
  "+201000000003",
  "blank store aliases must fall back to the original registration phone",
);

assert.equal(
  createSellerCardViewModel(sellerRow()).identityLabel,
  "seller-registration-uid",
  "uid remains a last-resort guard only when both requested labels are unavailable",
);

console.log("✅ seller-card identity label policy passed");
