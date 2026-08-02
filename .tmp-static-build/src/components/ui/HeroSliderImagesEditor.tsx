"use client";

import * as React from "react";
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
  const savedImages = React.useMemo(
    () =>
      value.slides
        .filter((slide) => slide.image)
        .slice(0, MAX_PROFILE_SLIDES)
        .map((slide) => ({ imageKey: slide.imageKey ?? "", url: slide.image })),
    [value.slides],
  );
  const [slotImages, setSlotImages] = React.useState<Array<StoredImage | null>>(
    () => Array.from({ length: MAX_PROFILE_SLIDES }, (_, index) => savedImages[index] ?? null),
  );

  React.useEffect(() => {
    setSlotImages((current) =>
      Array.from({ length: MAX_PROFILE_SLIDES }, (_, index) => {
        const currentImage = current[index] ?? null;
        if (currentImage?.isUploading || currentImage?.error) return currentImage;
        return savedImages[index] ?? null;
      }),
    );
  }, [savedImages]);

  const updateSlot = (index: number, nextSlotValue: StoredImage[]) => {
    const nextImages = [...slotImages];
    const image = nextSlotValue[0] ?? null;
    if (image) nextImages[index] = image;
    else nextImages[index] = null;
    setSlotImages(
      Array.from({ length: MAX_PROFILE_SLIDES }, (_, itemIndex) => nextImages[itemIndex] ?? null),
    );
    if (image && !image.url) return;
    const compact = nextImages
      .filter((item): item is StoredImage => Boolean(item?.url && !item.isUploading))
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
            value={slotImages[index] ? [slotImages[index]!] : []}
            onChange={(nextSlotImages) => updateSlot(index, nextSlotImages)}
          />
        ))}
      </div>
    </section>
  );
}
