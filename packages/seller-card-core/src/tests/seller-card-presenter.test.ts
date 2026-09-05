import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { UserProfileRow } from "@asol/data-core/profile";
import { createSellerCardViewModel } from "../application/seller-card-presenter";

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

const profilesServiceRow = sellerRow({
  store_name: "حساب السوبر ادمن 1",
  store_description: "وصف المتجر",
  primary_phone: "01026546550",
  rating_average: 450,
});
const profilesServiceCard = createSellerCardViewModel(profilesServiceRow);
assert.equal(
  profilesServiceCard.title,
  "حساب السوبر ادمن 1",
  "profiles service store_name must render as the card title",
);
assert.equal(
  profilesServiceCard.identityLabel,
  "حساب السوبر ادمن 1",
  "profiles service store_name must win over its phone",
);
assert.equal(
  profilesServiceCard.description,
  "وصف المتجر",
  "profiles service store_description must render on the card",
);
assert.equal(
  profilesServiceCard.ratingText,
  "4.5 / 5",
  "profiles service rating_average must render on the card",
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
  "",
  "uid must never be used as visible seller identity text",
);

const sellerCardSource = readFileSync(
  new URL("../presentation/SellerCard.tsx", import.meta.url),
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
const cardContentStart = sellerCardSource.indexOf(
  'id="features-seller-card-presentation-sellercard-div-5-h5pjcl"',
);
assert.notEqual(cardContentStart, -1, "seller card content element must exist");
const cardContentEnd = sellerCardSource.indexOf("</div>", cardContentStart);
assert.notEqual(cardContentEnd, -1, "seller card content element must close");
const cardContentSource = sellerCardSource.slice(cardContentStart, cardContentEnd);
assert.doesNotMatch(
  cardContentSource,
  /card\.(title|subtitle|description|ratingText)/,
  "seller card content must render only the identity label",
);

console.log("✅ seller-card identity label policy passed");
