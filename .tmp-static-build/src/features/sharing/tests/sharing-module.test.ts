import assert from "node:assert/strict";

import {
  buildFacebookShareUrl,
  buildProductShareUrl,
  buildProfileShareUrl,
  buildShareMessage,
  buildWhatsAppShareUrl,
  internalRouteFromPublicShareUrl,
  PUBLIC_SHARE_ORIGIN,
} from "../share-links";

const productUrl = buildProductShareUrl("product-123");
const parsedProduct = new URL(productUrl);
assert.equal(parsedProduct.origin, PUBLIC_SHARE_ORIGIN);
assert.equal(parsedProduct.pathname, "/s/product");
assert.equal(parsedProduct.searchParams.get("mode"), "view");
assert.equal(parsedProduct.searchParams.get("productId"), "product-123");
assert.equal(parsedProduct.searchParams.has("utm_source"), false);

const profileUrl = buildProfileShareUrl("usr_123");
const parsedProfile = new URL(profileUrl);
assert.equal(parsedProfile.pathname, "/s/profile");
assert.equal(parsedProfile.searchParams.get("mode"), "preview");
assert.equal(parsedProfile.searchParams.get("uid"), "usr_123");

const content = {
  kind: "product" as const,
  title: "هاتف S25 — 32,000 جنيه",
  text: "حالة ممتازة",
  url: productUrl,
};
assert.equal(
  buildShareMessage(content),
  `هاتف S25 — 32,000 جنيه\nحالة ممتازة\n${productUrl}`,
);
assert.equal(
  new URL(buildWhatsAppShareUrl(content)).searchParams.get("text"),
  buildShareMessage(content),
);
assert.equal(
  new URL(buildFacebookShareUrl(content)).searchParams.get("u"),
  productUrl,
);

assert.equal(
  internalRouteFromPublicShareUrl(productUrl),
  "/product?mode=view&productId=product-123",
);
assert.equal(
  internalRouteFromPublicShareUrl(profileUrl),
  "/profile?mode=preview&uid=usr_123",
);
assert.equal(
  internalRouteFromPublicShareUrl("https://evil.example/product?productId=1"),
  null,
);
assert.equal(
  internalRouteFromPublicShareUrl(`${PUBLIC_SHARE_ORIGIN}/settings`),
  null,
);

console.log("sharing module tests passed");
