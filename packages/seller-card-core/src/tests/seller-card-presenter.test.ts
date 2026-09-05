import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { ProfileDirectoryEntry } from "@asol/data-core/profile/entities";
import { createSellerCardViewModel } from "../application/seller-card-presenter";

function sellerRow(overrides: Partial<ProfileDirectoryEntry> & Record<string, unknown> = {}): ProfileDirectoryEntry {
  return {
    uid: "seller-registration-uid",
    storeName: "",
    storeDescription: "",
    storeStory: "",
    customRequestEnabled: true,
    trendingLabel: "",
    primaryPhone: "",
    ratingAverage: 0,
    ratingCount: 0,
    ...overrides,
  } as ProfileDirectoryEntry;
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
  storeName: "حساب السوبر ادمن 1",
  storeDescription: "وصف المتجر",
  primaryPhone: "01026546550",
  ratingAverage: 450,
});
const profilesServiceCard = createSellerCardViewModel(profilesServiceRow);
assert.equal(
  profilesServiceCard.title,
  "حساب السوبر ادمن 1",
  "profiles service storeName must render as the card title",
);
assert.equal(
  profilesServiceCard.identityLabel,
  "حساب السوبر ادمن 1",
  "profiles service storeName must win over its phone",
);
assert.equal(
  profilesServiceCard.description,
  "وصف المتجر",
  "profiles service storeDescription must render on the card",
);
assert.equal(
  profilesServiceCard.ratingText,
  "4.5 / 5",
  "profiles service ratingAverage must render on the card",
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
