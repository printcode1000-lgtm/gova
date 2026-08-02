"use client";

import { StorageImageManager } from "@/features/storage/components/StorageImageManager";
import { StorageProfiles } from "@/core/storage/constants/storage-profiles";
import type { StoredImage } from "@/core/storage/types/stored-image.types";

function normalizeProductImages(images: Array<StoredImage | null | undefined>, maxImages: number): StoredImage[] {
  return images
    .filter(
      (image): image is StoredImage =>
        Boolean(image && (image.url || image.isUploading || image.error)),
    )
    .slice(0, maxImages);
}

export function ProductImageEditors({
  maxImages,
  mainCategoryId,
  images,
  onChange,
  deferStorageDeletion = false,
}: {
  maxImages: number;
  mainCategoryId: string;
  images: StoredImage[];
  onChange: (images: StoredImage[]) => void;
  deferStorageDeletion?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: maxImages }, (_, index) => (
        <StorageImageManager
          key={index}
          config={{
            id: `product-image-${index + 1}`,
            storageProfileId: StorageProfiles.ProductDefault,
            storageScope: mainCategoryId,
            maxItems: 1,
            aspectRatio: "square",
            allowReplace: true,
            confirmUpload: false,
            confirmRemove: true,
            deleteFromStorageOnRemove: !deferStorageDeletion,
          }}
          value={images[index] ? [images[index]] : []}
          onChange={(slot) => {
            const next: Array<StoredImage | null> = [...images];
            if (slot[0]) next[index] = slot[0];
            else next[index] = null;
            onChange(normalizeProductImages(next, maxImages));
          }}
        />
      ))}
    </div>
  );
}
