import assert from "node:assert/strict";

import * as runtimeApi from "../index";
import {
  DEFAULT_FEATURED_MARQUEE_CONFIG,
  FEATURED_MARQUEE_CACHE_KEY,
  FEATURED_MARQUEE_ID,
  FEATURED_MARQUEE_SECTION_TITLE,
  clampFeaturedMarqueeCheckInterval,
  featuredMarqueeConfigSchema,
  normalizeFeaturedMarqueeConfig,
} from "../index";
import { createFeaturedMarqueeService } from "../server";

function runContractTest() {
  assert.equal(FEATURED_MARQUEE_ID, "home-featured-marquee");
  assert.equal(FEATURED_MARQUEE_CACHE_KEY, "advertisements:featured-marquee:v2");
  assert.equal(FEATURED_MARQUEE_SECTION_TITLE, "home.featured.title");
  assert.equal("createFeaturedMarqueeService" in runtimeApi, false);
  console.log("✅ featured-marquee-core contract test passed");
}

function runValidationTest() {
  assert.equal(featuredMarqueeConfigSchema.safeParse(DEFAULT_FEATURED_MARQUEE_CONFIG).success, true);
  assert.equal(featuredMarqueeConfigSchema.safeParse({ productIds: ["../bad"] }).success, false);
  assert.equal(clampFeaturedMarqueeCheckInterval(1), 5);
  assert.equal(clampFeaturedMarqueeCheckInterval(1500), 1440);
  console.log("✅ featured-marquee-core validation test passed");
}

function runNormalizeTest() {
  assert.deepEqual(normalizeFeaturedMarqueeConfig([]), { productIds: [] });
  assert.deepEqual(normalizeFeaturedMarqueeConfig(["product-1"]), {
    productIds: ["product-1"],
  });
  assert.deepEqual(
    normalizeFeaturedMarqueeConfig({ productIds: ["product-2"] }),
    { productIds: ["product-2"] },
  );
  assert.throws(() => normalizeFeaturedMarqueeConfig(["../bad"]));
  console.log("✅ featured-marquee-core normalize test passed");
}

async function runServiceTest() {
  const service = createFeaturedMarqueeService({
    auth: { isSuperAdminIdentity: () => true },
    repository: {
      async get() {
        return {
          id: FEATURED_MARQUEE_ID,
          config: DEFAULT_FEATURED_MARQUEE_CONFIG,
          version: 1,
          checkIntervalMinutes: 15,
          updatedAt: "2026-01-01T00:00:00.000Z",
          updatedBy: null,
        };
      },
      async save(config, checkIntervalMinutes, actorUid) {
        return {
          id: FEATURED_MARQUEE_ID,
          config,
          version: 2,
          checkIntervalMinutes,
          updatedAt: "2026-01-02T00:00:00.000Z",
          updatedBy: actorUid,
        };
      },
    },
  });
  const saved = await service.save(
    { uid: "admin", phone: "+201000000000" },
    { productIds: ["product-1"] },
    1,
  );
  assert.equal(saved.checkIntervalMinutes, 5);
  assert.equal(saved.updatedBy, "admin");
  console.log("✅ featured-marquee-core service test passed");
}

async function main() {
  console.log("🚀 Running @asol/featured-marquee-core test suite...\n");
  runContractTest();
  runValidationTest();
  runNormalizeTest();
  await runServiceTest();
  console.log("\n🎉 All @asol/featured-marquee-core tests passed successfully!");
}

main().catch((error) => {
  console.error("\n❌ @asol/featured-marquee-core test suite failed:", error);
  process.exit(1);
});
