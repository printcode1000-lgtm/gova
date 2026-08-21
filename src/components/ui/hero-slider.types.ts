import type { RefObject } from "react";

import type {
  HomeHeroConfig,
  HomeHeroSlide,
  HomeHeroTransition,
} from "@asol/hero-slider-core";
import type { StorageImageManagerHandle } from "@/features/storage/components/StorageImageManager";

export type HeroSliderTransition = HomeHeroTransition;
export type HeroSliderSlide = HomeHeroSlide;
export type HeroSliderConfig = HomeHeroConfig & {
  onAction?: (action: string) => void;
};

export type { HomeHeroTransition, HomeHeroSlide, HomeHeroConfig };

export interface HeroSliderProps {
  config: HeroSliderConfig;
  mode?: "view" | "admin-edit" | "images-edit";
  onChange?: (config: HeroSliderConfig) => void;
  onSave?: (config: HeroSliderConfig) => void;
  onCancel?: () => void;
  imageUploadRef?: RefObject<StorageImageManagerHandle | null>;
  onImagesPendingChange?: (pending: boolean) => void;
}
