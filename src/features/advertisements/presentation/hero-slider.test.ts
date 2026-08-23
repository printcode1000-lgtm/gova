import assert from "node:assert/strict";

import {
  heroSliderAdminEntries,
  shouldShowHeroSliderSkeleton,
} from "./hero-slider-model";
import { mergeHeroSliderAdminPreview } from "./hero-slider-admin-preview";
import { getHeroSlideStyleAndClass } from "./hero-slider-styles";
import {
  resolveHeroSlideNavigationDirection,
  resolveHeroSlideTransition,
} from "./hero-slider-transition-runtime";
import type { HeroSliderSlide } from "./hero-slider.types";

function classTokens(className: string): string[] {
  return className.split(/\s+/).filter(Boolean);
}

const sampleSlideFields = {
  title: "A",
  subtitle: "",
  duration: 4000,
  transition: "SlideLeft" as const,
  transitionDuration: 500,
  action: "",
};

function runSkeletonPolicyTest() {
  assert.equal(
    shouldShowHeroSliderSkeleton({
      isViewMode: false,
      probingCount: 2,
      visibleCount: 0,
    }),
    false,
  );
  assert.equal(
    shouldShowHeroSliderSkeleton({
      isViewMode: true,
      probingCount: 2,
      visibleCount: 0,
    }),
    true,
  );
  assert.equal(
    shouldShowHeroSliderSkeleton({
      isViewMode: true,
      probingCount: 0,
      visibleCount: 1,
    }),
    false,
  );
  console.log("✅ hero-slider skeleton policy passed");
}

function runAdminEntriesTest() {
  const slides: HeroSliderSlide[] = [
    {
      priority: 100,
      image: "",
      ...sampleSlideFields,
    },
  ];
  assert.equal(heroSliderAdminEntries(slides).length, 1);
  console.log("✅ hero-slider admin entries passed");
}

function runSlideClassSpacingTest() {
  const active = getHeroSlideStyleAndClass({
    current: 0,
    previous: null,
    index: 0,
    transition: "SlideLeft",
  });
  const tokens = classTokens(active.className);
  for (const required of ["absolute", "inset-0", "translate-x-0", "z-10"]) {
    assert.ok(
      tokens.includes(required),
      `expected standalone class "${required}" in "${active.className}"`,
    );
  }
  console.log("✅ hero-slider slide class spacing passed");
}

function runAdminPreviewMergeTest() {
  const config = {
    autoPlay: true,
    loop: true,
    slides: [
      {
        priority: 100,
        image: "/published.webp",
        imageKey: "published.webp",
        ...sampleSlideFields,
      },
    ],
  };
  const merged = mergeHeroSliderAdminPreview(config, {
    0: "data:image/webp;base64,preview",
  });
  assert.equal(merged.slides[0].image, "data:image/webp;base64,preview");
  assert.equal(config.slides[0].image, "/published.webp");
  console.log("✅ hero-slider admin preview merge passed");
}

function runTransitionRuntimeTest() {
  assert.equal(
    resolveHeroSlideTransition("SlideLeft", "backward", false),
    "SlideRight",
  );
  assert.equal(
    resolveHeroSlideNavigationDirection(0, 2, 4, true),
    "forward",
  );
  const slideUp = getHeroSlideStyleAndClass({
    current: 1,
    previous: 0,
    index: 1,
    transition: "SlideUp",
  });
  assert.ok(slideUp.className.includes("translate-y-0"));
  console.log("✅ hero-slider transition runtime passed");
}

runSkeletonPolicyTest();
runAdminEntriesTest();
runSlideClassSpacingTest();
runAdminPreviewMergeTest();
runTransitionRuntimeTest();
