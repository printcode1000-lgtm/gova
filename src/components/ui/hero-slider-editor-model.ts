import type {
  HeroSliderSlide,
  HeroSliderTransition,
} from "./HeroSlider";

export const heroSliderTransitions: HeroSliderTransition[] = [
  "Fade",
  "SlideLeft",
  "SlideRight",
  "Zoom",
  "Parallax",
];

export const createHeroSliderSlide = (priority: number): HeroSliderSlide => ({
  priority,
  image: "",
  title: "شريحة جديدة",
  subtitle: "",
  duration: 4000,
  action: "",
});
