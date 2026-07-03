import assert from "node:assert/strict";

import { categoryService, CATEGORY_CONSTANTS } from "../src/features/categories";

const main = categoryService.getAllDisplayCategories();
assert(main.length > 0, "main display list must not be empty");
assert.equal(main.filter((item) => item.id === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID).length, 0);
assert.equal(categoryService.getProfileMainOptions().filter((item) => item.id === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID).length, 1);

const medical = categoryService.getCategoryTree(CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID);
assert(medical, "medical category must exist");
const doctorGroup = medical.subcategories.find((item) => item.kind === "virtual-group");
assert.equal(doctorGroup?.canonicalKey, "virtual:doctor-appointment");
assert.equal(doctorGroup?.selectable, false);
assert(medical.doctorAppointmentItems.length > 0);
assert(medical.doctorAppointmentItems.every((item) => typeof item.originalId === "number"));

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
console.log("Category module tests passed.");
