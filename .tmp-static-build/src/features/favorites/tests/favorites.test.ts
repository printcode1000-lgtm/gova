import assert from "node:assert/strict";

import type { FavoriteItemInput } from "../entities/favorite.entity";
import {
  EMPTY_FAVORITE_COLLECTION,
  addFavorite,
  mergeFavoriteCollections,
  normalizeFavoriteCollection,
  removeFavorite,
  restoreFavorite,
} from "../services/favorite-collection";

const product: FavoriteItemInput = {
  type: "product",
  targetId: "prd_1",
  ownerUid: "seller_1",
  title: "Product one",
  subtitle: "Brand",
  imageUrl: "/product.png",
  priceText: "100",
  ratingText: "4.5 / 5",
  href: "/product?productId=prd_1",
};

const seller: FavoriteItemInput = {
  type: "seller",
  targetId: "seller_1",
  ownerUid: "seller_1",
  title: "Seller one",
  subtitle: "Pharmacy",
  imageUrl: "/seller.png",
  priceText: "",
  ratingText: "4.8 / 5",
  href: "/profile?mode=view&uid=seller_1",
};

const first = addFavorite(EMPTY_FAVORITE_COLLECTION, product, "2026-01-01T00:00:00.000Z");
assert.equal(first.items.length, 1);
assert.equal(first.items[0]?.key, "product:prd_1");

const updated = addFavorite(
  first,
  { ...product, title: "Updated product" },
  "2026-01-02T00:00:00.000Z",
);
assert.equal(updated.items.length, 1, "adding the same target must not duplicate it");
assert.equal(updated.items[0]?.title, "Updated product");
assert.equal(updated.items[0]?.savedAt, "2026-01-01T00:00:00.000Z");

const withSeller = addFavorite(updated, seller, "2026-01-03T00:00:00.000Z");
assert.deepEqual(
  withSeller.items.map((item) => item.type),
  ["seller", "product"],
  "favorites must be ordered newest first",
);

const removed = removeFavorite(withSeller, "seller:seller_1", "2026-01-04T00:00:00.000Z");
assert.equal(removed.items.length, 1);
assert.equal(removed.items[0]?.type, "product");

const restored = restoreFavorite(removed, withSeller.items[0]!, "2026-01-05T00:00:00.000Z");
assert.equal(restored.items.length, 2);
assert.equal(restored.items[0]?.type, "seller");

const guest = addFavorite(EMPTY_FAVORITE_COLLECTION, seller, "2026-01-06T00:00:00.000Z");
const merged = mergeFavoriteCollections(updated, guest, "2026-01-07T00:00:00.000Z");
assert.equal(merged.items.length, 2, "guest and account favorites must merge without loss");

const normalized = normalizeFavoriteCollection({
  items: [
    merged.items[0],
    merged.items[0],
    { type: "unknown", targetId: "bad" },
  ],
});
assert.equal(normalized.items.length, 1, "stored duplicates and invalid rows must be removed");

console.log("Favorites collection tests passed");
