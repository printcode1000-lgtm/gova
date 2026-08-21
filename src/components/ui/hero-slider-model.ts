import type { HeroSliderConfig, HeroSliderSlide } from "./hero-slider.types";

export function sortedHeroSlides(config: HeroSliderConfig | null | undefined) {
  if (!config?.slides) return [] as HeroSliderSlide[];
  return [...config.slides].sort((a, b) => a.priority - b.priority);
}

export function nextHeroSlideIndex(current: number, slideCount: number) {
  return slideCount > 0 ? (current + 1) % slideCount : 0;
}
