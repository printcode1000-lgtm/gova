import {
  createDefaultHomeHeroSlide,
  DEFAULT_HOME_HERO_TRANSITION,
  DEFAULT_HOME_HERO_TRANSITION_DURATION,
  HOME_HERO_TRANSITIONS,
} from "@asol/hero-slider-core";

import type { HeroSliderConfig, HeroSliderSlide, HeroSliderTransition } from "./hero-slider.types";

export const heroSliderTransitions = HOME_HERO_TRANSITIONS;

export const heroSliderTransitionLabels: Record<HeroSliderTransition, string> = {
  Fade: "تلاشي",
  CrossFade: "تلاشي متقاطع",
  SlideLeft: "انزلاق لليسار",
  SlideRight: "انزلاق لليمين",
  SlideUp: "انزلاق للأعلى",
  SlideDown: "انزلاق للأسفل",
  Zoom: "تكبير",
  Parallax: "بارالاكس",
  KenBurns: "كين بيرنز",
  None: "بدون انتقال",
};

export function createHeroSliderSlide(
  priority: number,
  defaults?: Pick<HeroSliderSlide, "transition" | "transitionDuration">,
): HeroSliderSlide {
  return createDefaultHomeHeroSlide(priority, defaults);
}

export function applyHeroSliderTransitionToSlides(
  config: HeroSliderConfig,
  transition: HeroSliderTransition,
  transitionDuration: number,
): HeroSliderConfig {
  return {
    ...config,
    slides: config.slides.map((slide) => ({
      ...slide,
      transition,
      transitionDuration,
    })),
  };
}

export {
  DEFAULT_HOME_HERO_TRANSITION,
  DEFAULT_HOME_HERO_TRANSITION_DURATION,
};
