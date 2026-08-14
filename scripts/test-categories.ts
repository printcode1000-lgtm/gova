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
assert.deepEqual(
  medical.subcategories.map((item) => item.canonicalKey),
  [
    "virtual:doctor-appointment",
    "subcategory:20:204",
    "subcategory:20:202",
    "subcategory:20:203",
    "subcategory:20:205",
    "subcategory:20:208",
    "subcategory:20:11",
  ],
  "medical services must show Doctor Appointment first and Pharmacies second",
);
assert(
  medical.subcategories.every(
    (item, index) => index === 0 || medical.subcategories[index - 1]!.order < item.order,
  ),
  "subcategory display order must be strictly increasing",
);

const regular = medical.doctorAppointmentItems[0]!;
const valid = categoryService.resolveProductSelection(
  String(CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID),
  String(regular.originalId),
);
assert.equal(valid.valid, true);
const invalid = categoryService.resolveProductSelection("1", "999999");
assert.equal(invalid.valid, false);

const collection = categoryService.getCollections()[0];
assert(collection, "at least one collection must exist");
const member = collection.items[0]!;
assert(
  categoryService.getHomeCategories().some((item) => item.id === collection.id && item.isCollection),
  "collections must remain main items on Home",
);
assert(
  categoryService.getProfileMainOptions().some(
    (item) => item.id === collection.id && item.isCollection,
  ),
  "collections must remain main items in profile Specialties",
);
assert(
  !categoryService.getDeveloperMainOptions().some((item) => item.id === collection.id),
  "the product category projection must not expose the collection label",
);
assert(
  categoryService.getDeveloperMainOptions().some((item) => item.id === member.id),
  "the product category projection must expose selected collection members as parents",
);
assert.equal(
  categoryService.resolveProductSelection(String(collection.id), String(member.id)).valid,
  false,
  "a collection member is a product-category parent, not a final product selection",
);
const memberSubcategory = categoryService.getCategoryTree(member.id)?.subcategories[0];
assert(memberSubcategory?.originalId, "collection member must expose product subcategories");
assert.equal(
  categoryService.resolveProductSelection(
    String(member.id),
    String(memberSubcategory.originalId),
  ).valid,
  true,
  "a collection member and its real subcategory must be a valid product selection",
);
assert.equal(
  categoryService.getDeveloperDetail(member.id, false)?.id,
  member.id,
  "product tools must resolve a collection member as a product-category parent",
);

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
