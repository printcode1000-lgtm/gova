"use client";

import * as React from "react";
import {
  StorageImageManager,
  type StorageImageManagerHandle,
} from "@/features/storage/components/StorageImageManager";
import {
  resolveProductStorageProfileId,
  type StoredImage,
} from "@asol/storage-core";

function normalizeProductImages(images: Array<StoredImage | null | undefined>, maxImages: number): StoredImage[] {
  return images
    .filter(
      (image): image is StoredImage =>
        Boolean(
          image &&
            (image.imageKey || image.url || image.isUploading || image.error),
        ),
    )
    .slice(0, maxImages);
}

export const ProductImageEditors = React.forwardRef<
  StorageImageManagerHandle,
  {
    maxImages: number;
    mainCategoryId: string;
    images: StoredImage[];
    onChange: (images: StoredImage[]) => void;
    onPendingChange?: (pending: boolean) => void;
    deferStorageDeletion?: boolean;
  }
>(function ProductImageEditors({
  maxImages,
  mainCategoryId,
  images,
  onChange,
  onPendingChange,
  deferStorageDeletion = false,
}, ref) {
  const managerRefs = React.useRef<Array<StorageImageManagerHandle | null>>([]);
  const pendingSlotsRef = React.useRef(new Set<number>());
  const imagesRef = React.useRef(images);
  const storageProfileId = resolveProductStorageProfileId(mainCategoryId);
  const normalized = React.useMemo(
    () => normalizeProductImages(images, maxImages),
    [images, maxImages],
  );
  imagesRef.current = normalized;

  const syncPending = React.useCallback(() => {
    onPendingChange?.(pendingSlotsRef.current.size > 0);
  }, [onPendingChange]);

  React.useImperativeHandle(ref, () => ({
    hasPending: () =>
      managerRefs.current.some((item) => item?.hasPending() ?? false),
    uploadPending: async () => {
      const results = await Promise.all(
        managerRefs.current.map((item) => item?.uploadPending() ?? Promise.resolve(true)),
      );
      return results.every(Boolean);
    },
  }));

  const slots = React.useMemo(
    () => Array.from({ length: maxImages }, (_, index) => index),
    [maxImages],
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {slots.map((index) => {
        const slotImage = normalized[index] ?? null;
        return (
          <StorageImageManager
            key={index}
            ref={(element) => {
              managerRefs.current[index] = element;
            }}
            config={{
              id: `product-image-${index}`,
              storageProfileId,
              storageScope: mainCategoryId,
              maxItems: 1,
              aspectRatio: "square",
              allowReplace: true,
              deleteFromStorageOnRemove: !deferStorageDeletion,
            }}
            value={slotImage ? [slotImage] : []}
            onChange={(nextSlotImages) => {
              const nextSlotImage = nextSlotImages[0] ?? null;
              const next: StoredImage[] = [...imagesRef.current];
              if (nextSlotImage) {
                next[index] = {
                  ...nextSlotImage,
                  storageProfileId:
                    nextSlotImage.storageProfileId ?? storageProfileId,
                };
              } else {
                next.splice(index, 1);
              }
              const updated = normalizeProductImages(next, maxImages);
              imagesRef.current = updated;
              onChange(updated);
            }}
            onPendingChange={(pending) => {
              if (pending) pendingSlotsRef.current.add(index);
              else pendingSlotsRef.current.delete(index);
              syncPending();
            }}
          />
        );
      })}
    </div>
  );
});
