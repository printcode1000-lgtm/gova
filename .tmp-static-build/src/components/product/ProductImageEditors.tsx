"use client";

import { StorageImageManager } from "@/features/storage/components/StorageImageManager";
import { StorageProfiles } from "@/core/storage/constants/storage-profiles";
import type { StoredImage } from "@/core/storage/types/stored-image.types";

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
            const next = [...images];
            if (slot[0]) next[index] = slot[0];
            else next.splice(index, 1);
            onChange(next.filter(Boolean).slice(0, maxImages));
          }}
        />
      ))}
    </div>
  );
}
