import type { HeroSliderTransition } from "./hero-slider.types";

export type HeroSliderNavigationDirection = "forward" | "backward";

export function resolveHeroSlideTransition(
  transition: HeroSliderTransition,
  direction: HeroSliderNavigationDirection,
  isRtl: boolean,
): HeroSliderTransition {
  if (transition === "None") return "None";

  const backward = direction === "backward";

  switch (transition) {
    case "SlideLeft":
      if (backward) return isRtl ? "SlideLeft" : "SlideRight";
      return isRtl ? "SlideRight" : "SlideLeft";
    case "SlideRight":
      if (backward) return isRtl ? "SlideRight" : "SlideLeft";
      return isRtl ? "SlideLeft" : "SlideRight";
    case "SlideUp":
      return backward ? "SlideDown" : "SlideUp";
    case "SlideDown":
      return backward ? "SlideUp" : "SlideDown";
    default:
      return transition;
  }
}

export function resolveHeroSlideNavigationDirection(
  fromIndex: number,
  toIndex: number,
  slideCount: number,
  loop: boolean,
): HeroSliderNavigationDirection {
  if (fromIndex === toIndex) return "forward";
  if (toIndex > fromIndex) return "forward";
  if (toIndex < fromIndex) return "backward";
  if (!loop || slideCount <= 1) return "forward";
  const forwardDistance = (toIndex - fromIndex + slideCount) % slideCount;
  const backwardDistance = (fromIndex - toIndex + slideCount) % slideCount;
  return forwardDistance <= backwardDistance ? "forward" : "backward";
}
