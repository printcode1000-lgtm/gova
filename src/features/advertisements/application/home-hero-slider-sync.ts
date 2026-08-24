export const HOME_HERO_UPDATED_EVENT = "asol:home-hero-slider-updated";

export function notifyHomeHeroSliderUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HOME_HERO_UPDATED_EVENT));
}
