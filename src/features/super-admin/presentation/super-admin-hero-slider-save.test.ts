import assert from "node:assert/strict";

import type { HeroSliderConfig } from "@/components/ui/hero-slider.types";
import { isHomeHeroConfigReadyToPersist } from "@asol/hero-slider-core";
import {
  heroSliderHasRemovedImages,
  heroSliderImagesFingerprint,
} from "./super-admin-hero-slider-save-model";

const sampleSlide = {
  priority: 100,
  image:
    "https://pub-example.r2.dev/images/content/advertisements/home-hero-slider/a.webp",
  imageKey: "a.webp",
  title: "A",
  subtitle: "",
  duration: 4000,
  transition: "SlideLeft" as const,
  transitionDuration: 500,
  action: "",
};

const sampleConfig: HeroSliderConfig = {
  autoPlay: true,
  loop: true,
  slides: [sampleSlide],
};

assert.equal(isHomeHeroConfigReadyToPersist(sampleConfig), true);
assert.equal(
  isHomeHeroConfigReadyToPersist({
    ...sampleConfig,
    slides: [
      {
        ...sampleSlide,
        imageKey: "",
      },
    ],
  }),
  false,
);
assert.equal(
  isHomeHeroConfigReadyToPersist({
    ...sampleConfig,
    slides: [
      {
        ...sampleSlide,
        image: "/images/mainCategories/Tech%20%26%20Electronics.webp",
        imageKey: "",
      },
    ],
  }),
  true,
);

assert.equal(heroSliderImagesFingerprint(sampleConfig), JSON.stringify(["a.webp"]));
assert.equal(
  heroSliderHasRemovedImages(sampleConfig, { ...sampleConfig, slides: [] }),
  true,
);
assert.equal(
  heroSliderHasRemovedImages(sampleConfig, sampleConfig),
  false,
);

console.log("✅ super-admin hero slider save model passed");
