import assert from "node:assert/strict";

import * as runtimeApi from "../index";
import {
  DEFAULT_HOME_HERO_CONFIG,
  HOME_HERO_CACHE_KEY,
  HOME_HERO_LEGACY_CACHE_KEY,
  HOME_HERO_SLIDER_ID,
  clampHomeHeroCheckInterval,
  homeHeroConfigSchema,
  homeHeroImageKeys,
} from "../index";
import { createHomeHeroSliderService } from "../server";

function runContractTest() {
  assert.equal(HOME_HERO_SLIDER_ID, "home-hero-slider");
  assert.equal(HOME_HERO_CACHE_KEY, "advertisements:home-hero-slider:v3");
  assert.equal(HOME_HERO_LEGACY_CACHE_KEY, "advertisements:home-hero-slider:v2");
  assert.equal("createHomeHeroSliderService" in runtimeApi, false);
  console.log("✅ hero-slider-core contract test passed");
}

function runValidationTest() {
  assert.equal(homeHeroConfigSchema.safeParse(DEFAULT_HOME_HERO_CONFIG).success, true);
  assert.equal(
    homeHeroConfigSchema.safeParse({
      ...DEFAULT_HOME_HERO_CONFIG,
      transitionDuration: 99,
    }).success,
    false,
  );
  assert.equal(clampHomeHeroCheckInterval(1), 5);
  assert.equal(clampHomeHeroCheckInterval(1500), 1440);
  console.log("✅ hero-slider-core validation test passed");
}

async function runServiceTest() {
  const records = {
    id: HOME_HERO_SLIDER_ID,
    config: {
      ...DEFAULT_HOME_HERO_CONFIG,
      slides: [
        {
          priority: 100,
          image: "",
          imageKey: "old.webp",
          title: "Old",
          subtitle: "",
          duration: 4000,
          action: "",
        },
      ],
    },
    version: 1,
    checkIntervalMinutes: 15,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: null,
  };
  const deleted: string[] = [];
  const service = createHomeHeroSliderService({
    auth: { isSuperAdminIdentity: () => true },
    imageStorage: {
      resolveUrl: (_profile, key) => `https://cdn.test/${key}`,
      async deleteByKey(_profile, key) {
        deleted.push(key);
      },
    },
    repository: {
      async get() {
        return records;
      },
      async save(config, checkIntervalMinutes, actorUid) {
        return {
          ...records,
          config,
          checkIntervalMinutes,
          updatedBy: actorUid,
          version: 2,
        };
      },
    },
  });
  const saved = await service.save(
    { uid: "admin", phone: "+201000000000" },
    { ...DEFAULT_HOME_HERO_CONFIG, slides: [] },
    1,
  );
  assert.equal(saved.checkIntervalMinutes, 5);
  assert.deepEqual(deleted, ["old.webp"]);
  assert.deepEqual(homeHeroImageKeys(records.config), ["old.webp"]);
  console.log("✅ hero-slider-core service test passed");
}

async function main() {
  console.log("🚀 Running @asol/hero-slider-core test suite...\n");
  runContractTest();
  runValidationTest();
  await runServiceTest();
  console.log("\n🎉 All @asol/hero-slider-core tests passed successfully!");
}

main().catch((error) => {
  console.error("\n❌ @asol/hero-slider-core test suite failed:", error);
  process.exit(1);
});
