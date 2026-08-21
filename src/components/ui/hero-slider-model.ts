import type { HeroSliderConfig, HeroSliderSlide } from "./hero-slider.types";

export interface HeroSliderSlideEntry {
  slide: HeroSliderSlide;
  originalIndex: number;
}

export function sortedHeroSlides(config: HeroSliderConfig | null | undefined) {
  if (!config?.slides) return [] as HeroSliderSlide[];
  return [...config.slides].sort((a, b) => a.priority - b.priority);
}

export function nextHeroSlideIndex(current: number, slideCount: number) {
  return slideCount > 0 ? (current + 1) % slideCount : 0;
}

function toSlideEntries(slides: HeroSliderSlide[]): HeroSliderSlideEntry[] {
  return slides.map((slide, originalIndex) => ({ slide, originalIndex }));
}

/** Admin preview shows every configured slide, including broken or empty images. */
export function heroSliderAdminEntries(
  slides: HeroSliderSlide[],
): HeroSliderSlideEntry[] {
  return toSlideEntries(slides);
}

/** View mode probes slides that have not finished loading yet. */
export function heroSliderProbingEntries(
  slides: HeroSliderSlide[],
  loadedImages: Record<number, boolean>,
  failedImages: Record<number, boolean>,
): HeroSliderSlideEntry[] {
  return toSlideEntries(slides).filter(
    ({ slide, originalIndex }) =>
      Boolean(slide.image) &&
      !loadedImages[originalIndex] &&
      !failedImages[originalIndex],
  );
}

/** Blocking skeleton is view-mode only, while every slide is still probing. */
export function shouldShowHeroSliderSkeleton(input: {
  isViewMode: boolean;
  probingCount: number;
  visibleCount: number;
}): boolean {
  if (!input.isViewMode) return false;
  return input.probingCount > 0 && input.visibleCount === 0;
}

/** View mode shows only slides whose image loaded successfully. */
export function heroSliderVisibleEntries(
  slides: HeroSliderSlide[],
  loadedImages: Record<number, boolean>,
  failedImages: Record<number, boolean>,
): HeroSliderSlideEntry[] {
  return toSlideEntries(slides).filter(
    ({ slide, originalIndex }) =>
      Boolean(slide.image) &&
      loadedImages[originalIndex] &&
      !failedImages[originalIndex],
  );
}
