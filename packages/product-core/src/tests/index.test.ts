import assert from "node:assert/strict";

import * as runtimeApi from "../index";
import {
  createEmptyProductDetails,
  normalizeProductDetails,
  normalizeProductStatus,
  isSafeProductId,
} from "../index";
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
  // Reached from request bodies cast to their input type without validation, so
  // these arrive at runtime despite the `string` parameter. Reading .length off
  // undefined turned a malformed payload into a 500 instead of a 400.
  assert.equal(isSafeProductId(undefined as unknown as string), false);
  assert.equal(isSafeProductId(null as unknown as string), false);
  assert.equal(isSafeProductId(42 as unknown as string), false);
  assert.equal(isSafeProductId({} as unknown as string), false);
  assert.equal(normalizeProductStatus(undefined), "active");
  assert.equal(normalizeProductStatus("draft"), "draft");
  console.log("✅ product-core ids test passed");
}

function runPublicSurfaceTest() {
  assert.equal(typeof runtimeApi.createEmptyProductDetails, "function");
  assert.equal("mapProductRow" in runtimeApi, false);
  console.log("✅ product-core public surface test passed");
}

async function main() {
  console.log("🚀 Running @asol/product-core test suite...\n");
  runEntityTest();
  runNormalizeTest();
  runIdsTest();
  runPublicSurfaceTest();
  console.log("\n🎉 All @asol/product-core tests passed successfully!");
}

main().catch((error) => {
  console.error("\n❌ @asol/product-core test suite failed:", error);
  process.exit(1);
});
