import type { HomeHeroConfig, HomeHeroSlide } from "./hero-slider.entity";
import { homeHeroImageKeys } from "./hero-slider.entity";

/** Storage object paths for the home-hero-slider profile across runtimes. */
export const HOME_HERO_MANAGED_IMAGE_MARKERS = [
  "images/advertisements/home-hero-slider/",
  "images/content/advertisements/home-hero-slider/",
] as const;

export function referencesManagedHomeHeroImage(slide: HomeHeroSlide): boolean {
  if (slide.imageKey?.trim()) return true;
  const image = slide.image.trim().toLowerCase();
  if (!image) return false;
  return HOME_HERO_MANAGED_IMAGE_MARKERS.some((marker) => image.includes(marker));
}

export function assertHomeHeroConfigPersistable(config: HomeHeroConfig): void {
  for (const slide of config.slides) {
    if (referencesManagedHomeHeroImage(slide) && !slide.imageKey?.trim()) {
      throw new Error("invalidHeroSliderConfig");
    }
  }
}

/** Persist only imageKey for managed slides; URLs are resolved per runtime on read. */
export function normalizeHomeHeroConfigForPersist(
  config: HomeHeroConfig,
): HomeHeroConfig {
  return {
    ...config,
    slides: config.slides.map((slide, index) => ({
      ...slide,
      id: slide.id?.trim() || `home-hero-slide-legacy-${index + 1}`,
      image: slide.imageKey?.trim() ? "" : slide.image,
    })),
  };
}

export function collectRemovedHomeHeroImageKeys(
  current: HomeHeroConfig,
  next: HomeHeroConfig,
): string[] {
  assertHomeHeroConfigPersistable(next);
  const nextKeys = new Set(homeHeroImageKeys(next));
  const currentKeys = homeHeroImageKeys(current);

  if (
    currentKeys.length > 0 &&
    nextKeys.size === 0 &&
    next.slides.length > 0 &&
    next.slides.some((slide) => referencesManagedHomeHeroImage(slide))
  ) {
    throw new Error("invalidHeroSliderConfig");
  }

  return currentKeys.filter((key) => !nextKeys.has(key));
}

export function prepareHomeHeroConfigForSave(config: HomeHeroConfig): HomeHeroConfig {
  const normalized = normalizeHomeHeroConfigForPersist(config);
  assertHomeHeroConfigPersistable(normalized);
  return normalized;
}

export function isHomeHeroConfigReadyToPersist(config: HomeHeroConfig): boolean {
  try {
    assertHomeHeroConfigPersistable(config);
    return true;
  } catch {
    return false;
  }
}
