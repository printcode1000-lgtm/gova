import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { categoryService } from "../src/features/categories";
import {
  isCatalogItemVisible,
  visibleCatalogItems,
} from '@asol/catalog-core';
import {
  vehicleGroupCatalogFileSchema,
  vehicleOptionCatalogFileSchema,
} from '@asol/catalog-core';
import { pharmacyStaticCatalogService } from "../src/features/pharmacy-profile-catalog/services/pharmacy-static-catalog.service";

type OrderedItem = { display: { order: number; hidden: boolean } };

function assertStrictOrder(items: readonly OrderedItem[], label: string): void {
  assert(
    items.every((item, index) => index === 0 || items[index - 1]!.display.order < item.display.order),
    `${label} must use a strict ascending display order`,
  );
  assert(items.every((item) => !item.display.hidden), `${label} must not expose hidden items`);
}

const visible = { id: "visible", display: { order: 20, hidden: false } };
const earlier = { id: "earlier", display: { order: 10, hidden: false } };
const hidden = { id: "hidden", display: { order: 1, hidden: true } };
assert.deepEqual(
  visibleCatalogItems([visible, hidden, earlier], (item) => item.id).map((item) => item.id),
  ["earlier", "visible"],
);
assert.equal(isCatalogItemVisible(visible, hidden), false, "a hidden ancestor must hide descendants");
assert.equal(isCatalogItemVisible(visible, earlier), true);

const home = categoryService.getHomeCategories();
assert.deepEqual(
  home.map((item) => item.canonicalKey),
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
);
assert(
  home.every((item, index) => index === 0 || home[index - 1]!.order < item.order),
  "Home categories must use strict Catalog order",
);

const pharmacyCategories = pharmacyStaticCatalogService.getCategories();
assertStrictOrder(pharmacyCategories, "Pharmacy categories");
for (const category of pharmacyCategories) {
  const subcategories = pharmacyStaticCatalogService.getSubcategories(category.id);
  assertStrictOrder(subcategories, `Pharmacy category ${category.id} subcategories`);
  for (const subcategory of subcategories) {
    assertStrictOrder(
      pharmacyStaticCatalogService.getActiveIngredients(subcategory.id),
      `Pharmacy subcategory ${subcategory.id} ingredients`,
    );
  }
}
assertStrictOrder(pharmacyStaticCatalogService.getForms(), "Pharmacy forms");
assertStrictOrder(pharmacyStaticCatalogService.getStrengths(), "Pharmacy strengths");

const catalogRoot = path.join(process.cwd(), "public", "catagory");
const vehicleGroups = vehicleGroupCatalogFileSchema.parse(
  JSON.parse(fs.readFileSync(path.join(catalogRoot, "vehicles", "groups.json"), "utf8")),
).items;
const visibleVehicleGroups = visibleCatalogItems(vehicleGroups, (group) => group.key);
assertStrictOrder(visibleVehicleGroups, "Vehicle groups");
for (const group of visibleVehicleGroups) {
  const options = vehicleOptionCatalogFileSchema.parse(
    JSON.parse(fs.readFileSync(path.join(catalogRoot, group.optionFile), "utf8")),
  ).items;
  assertStrictOrder(visibleCatalogItems(options, (option) => option.id), `${group.key} options`);
}

console.log("Catalog display order, visibility and ancestor-cascade contract passed.");
