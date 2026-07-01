"use client";

import * as React from "react";

import { ProductComponentFrame } from "./shared";
import type { ProductPreviewComponentProps } from "./types";

export function ProductImages({
  mode,
  maxImages,
}: ProductPreviewComponentProps & { maxImages: number }) {
  const [files, setFiles] = React.useState<File[]>([]);
  const urls = React.useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  React.useEffect(
    () => () => urls.forEach((url) => URL.revokeObjectURL(url)),
    [urls],
  );

  const demoCount = Math.min(Math.max(maxImages, 1), 4);

  return (
    <ProductComponentFrame title="الصور">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {urls.map((url, index) => (
          <div
            key={url}
            className="relative aspect-square overflow-hidden rounded-xl border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`صورة مختارة ${index + 1}`}
              className="h-full w-full object-cover"
            />
            {mode !== "view" ? (
              <button
                type="button"
                onClick={() =>
                  setFiles((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                className="absolute end-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white"
              >
                حذف
              </button>
            ) : null}
          </div>
        ))}
        {files.length === 0 && mode !== "new"
          ? Array.from({ length: demoCount }, (_, index) => (
              <div
                key={index}
                className="flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-sm text-muted-foreground"
              >
                صورة {index + 1}
              </div>
            ))
          : null}
      </div>
      {mode !== "view" ? (
        <label className="mt-4 block cursor-pointer rounded-xl border border-dashed p-4 text-center text-sm font-medium hover:bg-muted/40">
          اختيار صور من الجهاز ({files.length}/{maxImages})
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []);
              setFiles((current) =>
                [...current, ...selected].slice(0, maxImages),
              );
              event.target.value = "";
            }}
          />
        </label>
      ) : null}
    </ProductComponentFrame>
  );
}
