import assert from "node:assert/strict";

import { categoryService, CATEGORY_CONSTANTS } from "../src/features/categories";
import { visibleCatalogItems } from "../src/features/catalog-data/utils/catalog-display";

const main = categoryService.getAllDisplayCategories();
assert(main.length > 0, "main display list must not be empty");
assert.equal(main.filter((item) => item.id === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID).length, 1);
assert.equal(categoryService.getProfileMainOptions().filter((item) => item.id === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID).length, 1);
assert.deepEqual(
  main.map((item) => item.canonicalKey),
  [
    "category:1",
    "category:2",
    "category:3",
    "collection:0",
    "category:5",
    "category:6",
    "category:7",
    "category:8",
    "category:12",
    "category:13",
    "category:16",
    "category:17",
    "category:20",
    "category:4",
    "category:46",
  ],
  "home order must remain unchanged after the Catalog v3 migration",
);
assert(main.every((item, index) => index === 0 || main[index - 1]!.order < item.order));
assert.deepEqual(
  categoryService
    .getSpecialtyColumnItems()
    .filter((item) => item.categoryId === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID)
    .map((item) => item.originalId),
  [CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID],
);

const medical = categoryService.getCategoryTree(CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID);
assert(medical, "medical category must exist");
const doctorGroup = medical.subcategories.find((item) => item.kind === "virtual-group");
assert.equal(doctorGroup?.canonicalKey, "virtual:doctor-appointment");
assert.equal(doctorGroup?.selectable, false);
assert(medical.doctorAppointmentItems.length > 0);
assert(medical.doctorAppointmentItems.every((item) => typeof item.originalId === "number"));
assert(
  medical.subcategories.every(
    (item, index) => index === 0 || medical.subcategories[index - 1]!.order < item.order,
  ),
  "subcategory display order must be strictly increasing",
);

const regular = medical.doctorAppointmentItems[0]!;
const valid = categoryService.resolveLegacyProductSelection(
  String(CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID),
  String(regular.originalId),
);
assert.equal(valid.valid, true);
const invalid = categoryService.resolveLegacyProductSelection("1", "999999");
assert.equal(invalid.valid, false);

const collection = categoryService.getCollections()[0];
assert(collection, "at least one collection must exist");
const member = collection.items[0]!;
assert.equal(categoryService.resolveLegacyProductSelection(String(collection.id), String(member.id)).valid, true);

assert(categoryService.getSpecialtyColumnItems().length > 0);
assert.deepEqual(
  visibleCatalogItems(
    [
      { id: "z", display: { order: 10, hidden: false } },
      { id: "hidden", display: { order: 1, hidden: true } },
      { id: "a", display: { order: 10, hidden: false } },
    ],
    (item) => item.id,
  ).map((item) => item.id),
  ["a", "z"],
  "the shared display policy must hide globally and resolve ties deterministically",
);
console.log("Category module tests passed.");
