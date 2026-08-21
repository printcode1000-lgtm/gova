export const HOME_HERO_SLIDER_ID = "home-hero-slider";
export const HOME_HERO_CACHE_KEY = "advertisements:home-hero-slider:v3";
export const HOME_HERO_LEGACY_CACHE_KEY = "advertisements:home-hero-slider:v2";

export type HomeHeroTransition =
  | "Fade"
  | "SlideLeft"
  | "SlideRight"
  | "Zoom"
  | "Parallax";

export interface HomeHeroSlide {
  priority: number;
  image: string;
  imageKey?: string;
  title: string;
  subtitle: string;
  duration: number;
  action: string;
}

export interface HomeHeroConfig {
  transition: HomeHeroTransition;
  transitionDuration: number;
  autoPlay: boolean;
  loop: boolean;
  slides: HomeHeroSlide[];
}

export interface HomeHeroRecord {
  id: typeof HOME_HERO_SLIDER_ID;
  config: HomeHeroConfig;
  version: number;
  checkIntervalMinutes: number;
  updatedAt: string;
  updatedBy: string | null;
  storageWarning?: "imageDeleteFailed";
}

export interface HomeHeroPublished {
  config: HomeHeroConfig;
  version: number;
  checkIntervalMinutes: number;
  updatedAt: string;
}

export interface SuperAdminIdentity {
  uid: string;
  phone: string;
}

export const DEFAULT_HOME_HERO_CONFIG: HomeHeroConfig = {
  transition: "SlideLeft",
  transitionDuration: 500,
  autoPlay: false,
  loop: false,
  slides: [],
};

export const DEFAULT_HOME_HERO_PUBLISHED: HomeHeroPublished = {
  config: DEFAULT_HOME_HERO_CONFIG,
  version: 0,
  checkIntervalMinutes: 15,
  updatedAt: "",
};

export function clampHomeHeroCheckInterval(value: number): number {
  return Math.max(5, Math.min(1440, value));
}

export function homeHeroImageKeys(config: HomeHeroConfig): string[] {
  return config.slides
    .map((slide) => slide.imageKey)
    .filter((key): key is string => Boolean(key));
}
