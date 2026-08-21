import assert from "node:assert/strict";

import * as runtimeApi from "../index";
import {
  DEFAULT_TRENDING_RIBBON_CONFIG,
  TRENDING_RIBBON_CACHE_KEY,
  TRENDING_RIBBON_FALLBACK_LABEL,
  TRENDING_RIBBON_ID,
  clampTrendingRibbonCheckInterval,
  isTrendingRibbonPublished,
  trendingRibbonConfigSchema,
} from "../index";
import { createTrendingRibbonService } from "../server";

function runContractTest() {
  assert.equal(TRENDING_RIBBON_ID, "home-trending-ribbon");
  assert.equal(TRENDING_RIBBON_CACHE_KEY, "advertisements:trending-ribbon:v1");
  assert.equal(TRENDING_RIBBON_FALLBACK_LABEL, "home.trending.label");
  assert.equal("createTrendingRibbonService" in runtimeApi, false);
  console.log("✅ trending-ribbon-core contract test passed");
}

function runValidationTest() {
  assert.equal(trendingRibbonConfigSchema.safeParse(DEFAULT_TRENDING_RIBBON_CONFIG).success, true);
  assert.equal(trendingRibbonConfigSchema.safeParse({ label: "", items: [] }).success, false);
  assert.equal(isTrendingRibbonPublished({ config: DEFAULT_TRENDING_RIBBON_CONFIG, version: 1, checkIntervalMinutes: 15, updatedAt: "" }), true);
  assert.equal(clampTrendingRibbonCheckInterval(1), 5);
  assert.equal(clampTrendingRibbonCheckInterval(1500), 1440);
  console.log("✅ trending-ribbon-core validation test passed");
}

async function runServiceTest() {
  const service = createTrendingRibbonService({
    auth: { isSuperAdminIdentity: () => true },
    repository: {
      async get() {
        return {
          id: TRENDING_RIBBON_ID,
          config: DEFAULT_TRENDING_RIBBON_CONFIG,
          version: 1,
          checkIntervalMinutes: 15,
          updatedAt: "2026-01-01T00:00:00.000Z",
          updatedBy: null,
        };
      },
      async save(config, checkIntervalMinutes, actorUid) {
        return {
          id: TRENDING_RIBBON_ID,
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
    { label: "Trending", items: [{ label: "A", action: "go" }] },
    1,
  );
  assert.equal(saved.checkIntervalMinutes, 5);
  assert.equal(saved.updatedBy, "admin");
  console.log("✅ trending-ribbon-core service test passed");
}

async function main() {
  console.log("🚀 Running @asol/trending-ribbon-core test suite...\n");
  runContractTest();
  runValidationTest();
  await runServiceTest();
  console.log("\n🎉 All @asol/trending-ribbon-core tests passed successfully!");
}

main().catch((error) => {
  console.error("\n❌ @asol/trending-ribbon-core test suite failed:", error);
  process.exit(1);
});
