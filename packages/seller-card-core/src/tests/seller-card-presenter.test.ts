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
const avatarFallbackStart = sellerCardSource.indexOf(
  'id="features-seller-card-presentation-sellercard-div-4-a8zanz"',
);
assert.notEqual(avatarFallbackStart, -1, "seller avatar fallback element must exist");
const avatarFallbackEnd = sellerCardSource.indexOf("</div>", avatarFallbackStart);
assert.notEqual(avatarFallbackEnd, -1, "seller avatar fallback element must close");
const avatarFallbackSource = sellerCardSource.slice(
  avatarFallbackStart,
  avatarFallbackEnd,
);
assert.match(
  avatarFallbackSource,
  /<FallbackStoreIcon/,
  "seller avatar fallback must render a commerce/store icon",
);
assert.doesNotMatch(
  avatarFallbackSource,
  /card\.initials|UserRound/,
  "seller avatar fallback must never render initials or a person icon",
);
assert.match(
  sellerCardSource,
  /const commerceFallbackOptions = \[/,
  "seller cards without images must have a varied commerce icon pool",
);
assert.match(
  sellerCardSource,
  /text-orange-600[\s\S]*text-emerald-600[\s\S]*text-amber-600[\s\S]*text-violet-600[\s\S]*text-rose-600[\s\S]*text-fuchsia-600/,
  "commerce fallback icons must use distinct non-blue colors",
);
assert.match(
  sellerCardSource,
  /const identityColorClass = card\.avatarUrl \? "text-blue-600" : fallbackOption\.colorClass;/,
  "cards with profile images must use blue identity text while fallback cards inherit the icon color",
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
