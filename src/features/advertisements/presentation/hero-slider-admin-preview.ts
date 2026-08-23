import type { HeroSliderConfig } from "./hero-slider.types";

/** Merges local draft previews into the admin carousel without touching persisted config. */
export function mergeHeroSliderAdminPreview(
  config: HeroSliderConfig,
  previewImageBySlideIndex: Readonly<Record<number, string>>,
): HeroSliderConfig {
  if (!Object.keys(previewImageBySlideIndex).length) return config;
  return {
    ...config,
    slides: config.slides.map((slide, index) => {
      const preview = previewImageBySlideIndex[index];
      if (!preview) return slide;
      return { ...slide, image: preview };
    }),
  };
}
