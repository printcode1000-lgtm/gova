import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as runtimeApi from "../index";
import {
  createDefaultProductStyleComponents,
  normalizeProductStyleComponents,
  parseProductStyleSettings,
  productStylePublicPath,
} from "../index";
import * as serverApi from "../server";
import {
  filterSearchFieldsByStyle,
  readNormalizedStyleComponents,
  readProductStyleSettingsOrDefault,
  resolveProductStyleDefaultPath,
} from "../server";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function runNormalizeTest() {
  const normalized = normalizeProductStyleComponents({
    images: { visible: true, count: 2, order: 1 },
  });
  assert.equal(normalized.images.count, 2);
  assert.equal(normalized.searchColumns.mainData.name, true);
  console.log("✅ product-style-core normalize test passed");
}

function runValidationTest() {
  const parsed = parseProductStyleSettings({
    mainCategoryId: "delivery-services",
    subcategoryId: "delivery",
    components: createDefaultProductStyleComponents(),
  });
  assert.ok(parsed);
  assert.equal(parsed?.mainCategoryId, "delivery-services");
  assert.equal(parseProductStyleSettings({ mainCategoryId: "../bad", subcategoryId: "x", components: {} }), null);
  console.log("✅ product-style-core validation test passed");
}

function runPathsTest() {
  assert.equal(
    productStylePublicPath("cars", "sedan"),
    "/product/style/cars__sedan.json",
  );
  console.log("✅ product-style-core paths test passed");
}

async function runGeneratedMirrorReadTest() {
  const root = path.join(workspaceRoot, "tmp", "product-style-generated-read-test");
  const generatedStyle = path.join(root, "generated", "public", "product", "style");
  try {
    mkdirSync(generatedStyle, { recursive: true });
    const components = createDefaultProductStyleComponents();
    components.searchColumns.mainData.manufacturer = false;
    writeFileSync(
      path.join(generatedStyle, "1__1.json"),
      `${JSON.stringify({ mainCategoryId: "1", subcategoryId: "1", components }, null, 2)}\n`,
      "utf8",
    );
    const settings = await readProductStyleSettingsOrDefault(root, "1", "1");
    assert.equal(settings?.components.searchColumns.mainData.manufacturer, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  console.log("✅ product-style-core generated mirror read test passed");
}

async function runIntegrationTest() {
  const defaultPath = resolveProductStyleDefaultPath(workspaceRoot);
  const settings = await readProductStyleSettingsOrDefault(
    workspaceRoot,
    "delivery-services",
    "delivery",
  );
  assert.ok(settings);
  const components = await readNormalizedStyleComponents(
    workspaceRoot,
    "delivery-services",
    "delivery",
  );
  assert.equal(typeof components.images.visible, "boolean");
  const filtered = filterSearchFieldsByStyle(components, [
    { componentKey: "mainData", optionKey: "name" },
    { componentKey: "vehicleSpecs", optionKey: "brand" },
  ]);
  assert.ok(filtered.some((field) => field.optionKey === "name"));
  assert.equal(defaultPath.endsWith("default.json"), true);
  console.log("✅ product-style-core integration test passed");
}

function runPublicSurfaceTest() {
  assert.equal(typeof runtimeApi.normalizeProductStyleComponents, "function");
  assert.equal(typeof serverApi.readProductStyleSettingsOrDefault, "function");
  assert.equal("readProductStyleSettingsOrDefault" in runtimeApi, false);
  console.log("✅ product-style-core public surface test passed");
}

async function main() {
  console.log("🚀 Running @asol/product-style-core test suite...\n");
  runNormalizeTest();
  runValidationTest();
  runPathsTest();
  await runIntegrationTest();
  await runGeneratedMirrorReadTest();
  runPublicSurfaceTest();
  console.log("\n🎉 All @asol/product-style-core tests passed successfully!");
}

main().catch((error) => {
  console.error("\n❌ @asol/product-style-core test suite failed:", error);
  process.exit(1);
});
