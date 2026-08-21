import type { RefObject } from "react";

import type { StorageImageManagerHandle } from "@/features/storage/components/StorageImageManager";

export type HeroSliderTransition =
  | "Fade"
  | "SlideLeft"
  | "SlideRight"
  | "Zoom"
  | "Parallax";

export interface HeroSliderSlide {
  priority: number;
  image: string;
  imageKey?: string;
  title: string;
  subtitle: string;
  duration: number;
  action: string;
}

export interface HeroSliderConfig {
  transition: HeroSliderTransition;
  transitionDuration: number;
  autoPlay: boolean;
  loop: boolean;
  slides: HeroSliderSlide[];
  onAction?: (action: string) => void;
}

export interface HeroSliderProps {
  config: HeroSliderConfig;
  mode?: "view" | "admin-edit" | "images-edit";
  onChange?: (config: HeroSliderConfig) => void;
  onSave?: (config: HeroSliderConfig) => void;
  onCancel?: () => void;
  imageUploadRef?: RefObject<StorageImageManagerHandle | null>;
  onImagesPendingChange?: (pending: boolean) => void;
}
