"use client";

import { ImageIcon } from "lucide-react";

import type { StoredImage } from "@/core/storage/types/stored-image.types";
import {
  parseStorageImageManagerConfig,
  StorageImageManager,
} from "@/features/storage/components/StorageImageManager";
import storefrontImagesConfig from "@/components/profile/image-configs/storefront-images.image.json";
import type { HeroSliderConfig, HeroSliderSlide } from "./HeroSlider";

const storefrontSlots = storefrontImagesConfig.slots.map(
  parseStorageImageManagerConfig,
);
const MAX_PROFILE_SLIDES = storefrontSlots.length;

interface HeroSliderImagesEditorProps {
  value: HeroSliderConfig;
  onChange: (config: HeroSliderConfig) => void;
}

function createSlide(image: StoredImage, index: number): HeroSliderSlide {
  return {
    priority: (index + 1) * 100,
    image: image.url,
    imageKey: image.imageKey,
    title: "",
    subtitle: "",
    duration: 4000,
    action: "",
  };
}

export function HeroSliderImagesEditor({
  value,
  onChange,
}: HeroSliderImagesEditorProps) {
  const images = value.slides
    .filter((slide) => slide.image)
    .slice(0, MAX_PROFILE_SLIDES)
    .map((slide) => ({ imageKey: slide.imageKey ?? "", url: slide.image }));

  const updateSlot = (index: number, slotImages: StoredImage[]) => {
    const nextImages = [...images];
    const image = slotImages[0] ?? null;
    if (image) nextImages[index] = image;
    else nextImages.splice(index, 1);
    const compact = nextImages
      .filter((item) => item?.url)
      .slice(0, MAX_PROFILE_SLIDES);
    onChange({
      ...value,
      slides: compact.map(createSlide),
    });
  };

  return (
    <section
      className="mt-4 rounded-xl border bg-card p-4 shadow-sm"
      aria-label="تعديل صور العرض"
    >
      <div className="mb-4 flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-semibold">صور واجهة المتجر</h2>
          <p className="text-sm text-muted-foreground">
            يمكنك إضافة أو استبدال ثلاث صور بحد أقصى. بقية إعدادات العرض ثابتة.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {storefrontSlots.map((slotConfig, index) => (
          <StorageImageManager
            key={slotConfig.id}
            config={slotConfig}
            value={images[index] ? [images[index]] : []}
            onChange={(slotImages) => updateSlot(index, slotImages)}
          />
        ))}
      </div>
    </section>
  );
}
