import type { HeroSliderConfig } from "@/components/ui/hero-slider.types";
import { isHomeHeroConfigReadyToPersist } from "@asol/hero-slider-core";

export function heroSliderFingerprint(
  config: HeroSliderConfig,
  intervalMinutes: number,
): string {
  return JSON.stringify({ config, intervalMinutes });
}

/** Managed hero images must carry imageKey before persistence (all runtimes). */
export function isHeroSliderConfigReadyToPersist(
  config: HeroSliderConfig,
): boolean {
  return isHomeHeroConfigReadyToPersist(config);
}
