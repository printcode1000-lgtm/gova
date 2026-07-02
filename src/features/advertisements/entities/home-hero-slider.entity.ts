export const HOME_HERO_SLIDER_ID = "home-hero-slider";

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
  draft: HomeHeroConfig;
  published: HomeHeroConfig;
  status: "draft" | "published";
  version: number;
  revision: number;
  schemaVersion: number;
  checkIntervalMinutes: number;
  updatedAt: string;
  publishedAt: string;
  updatedBy: string | null;
  publishedBy: string | null;
}

export interface HomeHeroPublication {
  id: number;
  version: number;
  publishedBy: string;
  publishedAt: string;
}

export interface HomeHeroPublished {
  config: HomeHeroConfig;
  version: number;
  checkIntervalMinutes: number;
  publishedAt: string;
}

export interface SuperAdminIdentity {
  uid: string;
  phone: string;
}
