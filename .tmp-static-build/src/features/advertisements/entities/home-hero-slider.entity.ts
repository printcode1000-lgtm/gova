export const HOME_HERO_SLIDER_ID = "home-hero-slider";
export const HOME_HERO_CACHE_KEY = "advertisements:home-hero-slider:v3";

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
