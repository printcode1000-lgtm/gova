import assert from "node:assert/strict";

import * as runtimeApi from "../index";
import {
  createEmptyProductDetails,
  normalizeProductDetails,
  normalizeProductStatus,
  isSafeProductId,
} from "../index";
import * as serverApi from "../server";
import {
  mapProductRow,
  productRowValues,
  PRODUCT_COLUMNS,
  type ProductRow,
} from "../server";

function runEntityTest() {
  const empty = createEmptyProductDetails();
  assert.equal(empty.mainData.available, true);
  assert.deepEqual(empty.images, []);
  console.log("✅ product-core entity test passed");
}

function runNormalizeTest() {
  const normalized = normalizeProductDetails({
    ...createEmptyProductDetails(),
    mainData: {
      name: "  test  ",
      brand: "",
      manufacturer: "",
      available: true,
      description: "",
    },
    images: [{ imageKey: "abc", url: "https://ignored.example" }],
  });
  assert.equal(normalized.mainData.name, "  test  ");
  assert.equal(normalized.images[0]?.url, "");
  assert.equal(normalized.images[0]?.imageKey, "abc");
  console.log("✅ product-core normalize test passed");
}

function runIdsTest() {
  assert.equal(isSafeProductId("product-1"), true);
  assert.equal(isSafeProductId("../bad"), false);
  assert.equal(normalizeProductStatus(undefined), "active");
  assert.equal(normalizeProductStatus("draft"), "draft");
  console.log("✅ product-core ids test passed");
}

function runRowMappingTest() {
  const row = Object.fromEntries(
    PRODUCT_COLUMNS.map((column) => [column, ""]),
  ) as unknown as ProductRow;
  row.id = "product-1";
  row.uid = "user-1";
  row.main_category_id = "cars";
  row.subcategory_id = "sedan";
  row.main_name = "Widget";
  row.main_available = 1;
  row.status = "active";
  row.created_at = "2026-01-01T00:00:00.000Z";
  row.updated_at = "2026-01-01T00:00:00.000Z";
  row.images_json = "[]";
  const record = mapProductRow(row);
  assert.equal(record.mainData.name, "Widget");
  const values = productRowValues(record);
  assert.equal(values.length, PRODUCT_COLUMNS.length);
  assert.equal(values[PRODUCT_COLUMNS.indexOf("main_name")], "Widget");
  console.log("✅ product-core row mapping test passed");
}

function runPublicSurfaceTest() {
  assert.equal(typeof runtimeApi.createEmptyProductDetails, "function");
  assert.equal(typeof serverApi.mapProductRow, "function");
  assert.equal("mapProductRow" in runtimeApi, false);
  console.log("✅ product-core public surface test passed");
}

async function main() {
  console.log("🚀 Running @asol/product-core test suite...\n");
  runEntityTest();
  runNormalizeTest();
  runIdsTest();
  runRowMappingTest();
  runPublicSurfaceTest();
  console.log("\n🎉 All @asol/product-core tests passed successfully!");
}

main().catch((error) => {
  console.error("\n❌ @asol/product-core test suite failed:", error);
  process.exit(1);
});
