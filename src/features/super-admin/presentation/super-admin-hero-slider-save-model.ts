import type { HeroSliderConfig } from "@/features/advertisements/ui";
import { homeHeroImageKeys, isHomeHeroConfigReadyToPersist } from "@asol/hero-slider-core";

export function heroSliderFingerprint(
  config: HeroSliderConfig,
  intervalMinutes: number,
): string {
  return JSON.stringify({ config, intervalMinutes });
}

export function heroSliderImagesFingerprint(config: HeroSliderConfig): string {
  return JSON.stringify(
    config.slides.map((slide) => slide.imageKey?.trim() ?? ""),
  );
}

export function heroSliderHasRemovedImages(
  savedConfig: HeroSliderConfig,
  currentConfig: HeroSliderConfig,
): boolean {
  const currentKeys = new Set(homeHeroImageKeys(currentConfig));
  return homeHeroImageKeys(savedConfig).some((key) => !currentKeys.has(key));
}

/** Managed hero images must carry imageKey before persistence (all runtimes). */
export function isHeroSliderConfigReadyToPersist(
  config: HeroSliderConfig,
): boolean {
  return isHomeHeroConfigReadyToPersist(config);
}
