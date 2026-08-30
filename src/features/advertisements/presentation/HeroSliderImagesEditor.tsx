"use client";

import * as React from "react";
import { ImageIcon } from "lucide-react";

import type { StoredImage } from "@asol/storage-core";
import {
  parseStorageImageManagerConfig,
  StorageImageManager,
  type StorageImageManagerHandle,
} from "@/features/storage/ui";
import type { HeroSliderConfig, HeroSliderSlide } from "./HeroSlider";
import {
  DEFAULT_HOME_HERO_TRANSITION,
  DEFAULT_HOME_HERO_TRANSITION_DURATION,
} from "@asol/hero-slider-core";

const HERO_SLIDER_IMAGE_SLOTS = [
  { id: "hero-slide-1", storageProfileId: "cover", maxItems: 1, aspectRatio: "landscape", allowReplace: true },
  { id: "hero-slide-2", storageProfileId: "cover", maxItems: 1, aspectRatio: "landscape", allowReplace: true },
  { id: "hero-slide-3", storageProfileId: "cover", maxItems: 1, aspectRatio: "landscape", allowReplace: true },
  { id: "hero-slide-4", storageProfileId: "cover", maxItems: 1, aspectRatio: "landscape", allowReplace: true },
] as const;

const storefrontSlots = HERO_SLIDER_IMAGE_SLOTS.map(parseStorageImageManagerConfig);
const MAX_PROFILE_SLIDES = storefrontSlots.length;

interface HeroSliderImagesEditorProps {
  value: HeroSliderConfig;
  onChange: (config: HeroSliderConfig) => void;
  onPendingChange?: (pending: boolean) => void;
  id?: string;
}

function createSlide(image: StoredImage, index: number): HeroSliderSlide {
  return {
    priority: (index + 1) * 100,
    image: image.url,
    imageKey: image.imageKey,
    title: "",
    subtitle: "",
    duration: 4000,
    transition: DEFAULT_HOME_HERO_TRANSITION,
    transitionDuration: DEFAULT_HOME_HERO_TRANSITION_DURATION,
    action: "",
  };
}

export const HeroSliderImagesEditor = React.forwardRef<
  StorageImageManagerHandle,
  HeroSliderImagesEditorProps
>(function HeroSliderImagesEditor({
  value,
  onChange,
  onPendingChange,
  id,
}, ref) {
  const managerRefs = React.useRef<Array<StorageImageManagerHandle | null>>([]);
  const valueRef = React.useRef(value);
  valueRef.current = value;
  const [pendingSlots, setPendingSlots] = React.useState<Set<number>>(() => new Set());
  React.useEffect(() => {
    onPendingChange?.(pendingSlots.size > 0);
  }, [onPendingChange, pendingSlots]);
  React.useImperativeHandle(ref, () => ({
    hasPending: () => managerRefs.current.some((manager) => manager?.hasPending()),
    uploadPending: async () => {
      for (const manager of managerRefs.current) {
        if (manager?.hasPending() && !(await manager.uploadPending())) return false;
      }
      return true;
    },
  }), []);
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
  const slotImagesRef = React.useRef(slotImages);
  slotImagesRef.current = slotImages;

  React.useEffect(() => {
    setSlotImages((current) => {
      const next = Array.from({ length: MAX_PROFILE_SLIDES }, (_, index) => {
        const currentImage = current[index] ?? null;
        if (currentImage?.isUploading || currentImage?.error) return currentImage;
        return savedImages[index] ?? null;
      });
      slotImagesRef.current = next;
      return next;
    });
  }, [savedImages]);

  const updateSlot = (index: number, nextSlotValue: StoredImage[]) => {
    const nextImages = [...slotImagesRef.current];
    const image = nextSlotValue[0] ?? null;
    if (image) nextImages[index] = image;
    else nextImages[index] = null;
    const normalizedSlots = Array.from(
      { length: MAX_PROFILE_SLIDES },
      (_, itemIndex) => nextImages[itemIndex] ?? null,
    );
    slotImagesRef.current = normalizedSlots;
    setSlotImages(normalizedSlots);
    if (image && !image.url) return;
    const compact = nextImages
      .filter((item): item is StoredImage => Boolean(item?.url && !item.isUploading))
      .slice(0, MAX_PROFILE_SLIDES);
    const nextValue = {
      ...valueRef.current,
      slides: compact.map(createSlide),
    };
    valueRef.current = nextValue;
    onChange(nextValue);
  };

  return (
    <section
      id={id}
      className="mt-4 rounded-xl border bg-card p-4 shadow-sm"
      aria-label="تعديل صور العرض"
    >
      <div id="advertisements.hero-slider-images-editor.div" className="mb-4 flex items-center gap-2">
        <ImageIcon id="advertisements.hero-slider-images-editor.image-icon" className="h-5 w-5 text-primary" />
        <div id="advertisements.hero-slider-images-editor.div.2">
          <h2 id="advertisements.hero-slider-images-editor.h2" className="font-semibold">صور واجهة المتجر</h2>
          <p id="advertisements.hero-slider-images-editor.p" className="text-sm text-muted-foreground">
            يمكنك إضافة أو استبدال {MAX_PROFILE_SLIDES} صور بحد أقصى. بقية إعدادات العرض ثابتة.
          </p>
        </div>
      </div>
      <div id="advertisements.hero-slider-images-editor.div.3" className="grid grid-cols-2 gap-3">
        {storefrontSlots.map((slotConfig, index) => (
          <StorageImageManager
            ref={(manager) => {
              managerRefs.current[index] = manager;
            }}
            key={slotConfig.id}
            config={slotConfig}
            value={slotImages[index] ? [slotImages[index]!] : []}
            onChange={(nextSlotImages) => updateSlot(index, nextSlotImages)}
            onPendingChange={(pending) => {
              setPendingSlots((current) => {
                const next = new Set(current);
                if (pending) next.add(index);
                else next.delete(index);
                return next;
              });
            }}
          />
        ))}
      </div>
    </section>
  );
});
