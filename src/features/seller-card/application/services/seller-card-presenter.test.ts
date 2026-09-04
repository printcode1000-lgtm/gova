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
  "store alias must win over the registration phone",
);

assert.equal(
  createSellerCardViewModel(
    sellerRow({
      storeName: "",
      store_name: "متجر من صف SQL الخام",
      registrationPhone: "+201000000002",
    }),
  ).identityLabel,
  "متجر من صف SQL الخام",
  "raw profile rows must expose their store_name as the seller alias",
);

assert.equal(
  createSellerCardViewModel(
    sellerRow({ registrationPhone: "+201000000003" }),
  ).identityLabel,
  "+201000000003",
  "registration phone must be shown when the store alias is absent",
);

assert.equal(
  createSellerCardViewModel(
    sellerRow({ registration_phone: "+201000000004" }),
  ).identityLabel,
  "+201000000004",
  "snake-case registration phone must also be supported when supplied",
);

assert.equal(
  createSellerCardViewModel(
    sellerRow({ primaryPhone: "+201000000005" }),
  ).identityLabel,
  "",
  "profile primary phone must not replace the original registration phone",
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
