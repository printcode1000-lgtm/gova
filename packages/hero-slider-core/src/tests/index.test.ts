import assert from "node:assert/strict";

import * as runtimeApi from "../index";
import {
  DEFAULT_HOME_HERO_CONFIG,
  HOME_HERO_CACHE_KEY,
  HOME_HERO_LEGACY_CACHE_KEY,
  HOME_HERO_SLIDER_ID,
  clampHomeHeroCheckInterval,
  collectRemovedHomeHeroImageKeys,
  homeHeroConfigSchema,
  homeHeroImageKeys,
  normalizeHomeHeroConfig,
  normalizeHomeHeroConfigForPersist,
  prepareHomeHeroConfigForSave,
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
      slides: [
        {
          priority: 100,
          image: "x",
          title: "t",
          subtitle: "",
          duration: 4000,
          transition: "Fade",
          transitionDuration: 4000,
          action: "",
        },
      ],
    }).success,
    false,
  );
  assert.equal(clampHomeHeroCheckInterval(1), 5);
  assert.equal(clampHomeHeroCheckInterval(1500), 1440);
  console.log("✅ hero-slider-core validation test passed");
}

function runNormalizeTest() {
  const legacy = {
    transition: "Fade",
    transitionDuration: 800,
    autoPlay: true,
    loop: false,
    slides: [
      {
        priority: 100,
        image: "x",
        title: "t",
        subtitle: "",
        duration: 4000,
        action: "",
      },
    ],
  };
  const normalized = normalizeHomeHeroConfig(legacy);
  assert.equal(normalized.slides[0]?.transition, "Fade");
  assert.equal(normalized.slides[0]?.transitionDuration, 800);
  console.log("✅ hero-slider-core normalize test passed");
}

function runPersistTest() {
  const managedSlide = {
    priority: 100,
    image:
      "https://cdn.example/images/content/advertisements/home-hero-slider/new.webp",
    imageKey: "new.webp",
    title: "Managed",
    subtitle: "",
    duration: 4000,
    transition: "SlideLeft" as const,
    transitionDuration: 500,
    action: "",
  };
  const normalized = normalizeHomeHeroConfigForPersist({
    ...DEFAULT_HOME_HERO_CONFIG,
    slides: [managedSlide],
  });
  assert.equal(normalized.slides[0]?.image, "");
  assert.equal(normalized.slides[0]?.imageKey, "new.webp");

  assert.throws(
    () =>
      prepareHomeHeroConfigForSave({
        ...DEFAULT_HOME_HERO_CONFIG,
        slides: [
          {
            ...managedSlide,
            imageKey: "",
          },
        ],
      }),
    /invalidHeroSliderConfig/,
  );

  assert.throws(
    () =>
      collectRemovedHomeHeroImageKeys(
        {
          ...DEFAULT_HOME_HERO_CONFIG,
          slides: [{ ...managedSlide, imageKey: "old.webp" }],
        },
        {
          ...DEFAULT_HOME_HERO_CONFIG,
          slides: [{ ...managedSlide, imageKey: "" }],
        },
      ),
    /invalidHeroSliderConfig/,
  );

  console.log("✅ hero-slider-core persist test passed");
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
          transition: "SlideLeft",
          transitionDuration: 500,
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
      async existsByKey() {
        return true;
      },
      async deleteByKey(_profile, key) {
        deleted.push(key);
      },
    },
    repository: {
      async get() {
        return records;
      },
      async save(config, checkIntervalMinutes, actorUid) {
        records.config = config;
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
  assert.deepEqual(homeHeroImageKeys(records.config), []);
  assert.equal(records.config.slides.length, 0);
  console.log("✅ hero-slider-core service test passed");
}

async function main() {
  console.log("🚀 Running @asol/hero-slider-core test suite...\n");
  runContractTest();
  runValidationTest();
  runNormalizeTest();
  runPersistTest();
  await runServiceTest();
  console.log("\n🎉 All @asol/hero-slider-core tests passed successfully!");
}

main().catch((error) => {
  console.error("\n❌ @asol/hero-slider-core test suite failed:", error);
  process.exit(1);
});
