import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { UserProfileRow } from "@/features/profile";
import { createSellerCardViewModel } from "./seller-card-presenter";

function sellerRow(overrides: Record<string, unknown> = {}): UserProfileRow {
  return {
    uid: "seller-registration-uid",
    storeName: "",
    storeDescription: "",
    storeStory: "",
    primaryPhone: "",
    ...overrides,
  } as unknown as UserProfileRow;
}

assert.equal(
  createSellerCardViewModel(
    sellerRow({
      storeName: "متجر النور",
      primaryPhone: "+201000000001",
    }),
  ).identityLabel,
  "متجر النور",
  "store alias must win over the registration phone",
);

assert.equal(
  createSellerCardViewModel(
    sellerRow({ primaryPhone: "+201000000002" }),
  ).identityLabel,
  "+201000000002",
  "registration phone must be shown when the store alias is absent",
);

assert.equal(
  createSellerCardViewModel(
    sellerRow({
      storeName: "   ",
      primaryPhone: "+201000000003",
    }),
  ).identityLabel,
  "+201000000003",
  "blank store aliases must fall back to the registration phone",
);

assert.equal(
  createSellerCardViewModel(sellerRow()).identityLabel,
  "",
  "uid must never be used as visible seller identity text",
);

const sellerCardSource = readFileSync(
  new URL("../../presentation/SellerCard.tsx", import.meta.url),
  "utf8",
);
const identityElementStart = sellerCardSource.indexOf(
  'id="features-seller-card-presentation-sellercard-div-10-cduns8"',
);
assert.notEqual(identityElementStart, -1, "seller identity element must exist");
const identityElementEnd = sellerCardSource.indexOf("</div>", identityElementStart);
assert.notEqual(identityElementEnd, -1, "seller identity element must close");
const identityElementSource = sellerCardSource.slice(
  identityElementStart,
  identityElementEnd,
);
assert.match(
  identityElementSource,
  /\{card\.identityLabel\}/,
  "seller identity element must render identityLabel",
);
assert.doesNotMatch(
  identityElementSource,
  /card\.badges|badge\.label/,
  "seller identity element must render no badges or other identity content",
);

console.log("✅ seller-card identity label policy passed");
