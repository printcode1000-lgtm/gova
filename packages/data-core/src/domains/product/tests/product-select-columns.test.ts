import assert from "node:assert/strict";

import {
  productSelectColumns,
  productTableColumnNames,
} from "../repositories/product-select-columns";

const existingColumns = productTableColumnNames([
  { name: "id" },
  { name: "uid" },
  { name: "main_category_id" },
  { name: "subcategory_id" },
  { name: "main_name" },
  { name: 123 },
  {},
  null,
]);

const select = productSelectColumns(existingColumns);

assert.match(select, /`id`/);
assert.match(select, /`main_name`/);
assert.match(select, /'' AS `main_brand`/);
assert.match(select, /1 AS `main_available`/);
assert.match(select, /0 AS `price_needs_car`/);
assert.match(select, /'\[\]' AS `images_json`/);
assert.match(select, /'active' AS `status`/);
assert.equal(select.includes("undefined"), false);

console.log("Product select column compatibility passed.");
