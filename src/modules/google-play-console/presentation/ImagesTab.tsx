"use client";

import { Image as ImageIcon, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { GOOGLE_PLAY_IMAGE_TYPES, type GooglePlayImageType, type GooglePlayStoreAssetsSnapshot } from "../domain/store-assets-types";

export function ImagesTab({
  snapshot,
  language,
  imageType,
  busy,
  t,
  onLanguageChange,
  onImageTypeChange,
  onFiles,
  onDeleteImage,
}: {
  snapshot: GooglePlayStoreAssetsSnapshot;
  language: string;
  imageType: GooglePlayImageType;
  busy: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onLanguageChange: (value: string) => void;
  onImageTypeChange: (value: GooglePlayImageType) => void;
  onFiles: (files: FileList | null) => void;
  onDeleteImage: (imageId: string, language: string, imageType: GooglePlayImageType) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 rounded-md border bg-surface p-4 md:grid-cols-[160px_220px_1fr]">
        <Input value={language} onChange={(event) => onLanguageChange(event.target.value)} />
        <select value={imageType} onChange={(event) => onImageTypeChange(event.target.value as GooglePlayImageType)} className="h-10 rounded-md border bg-background px-3 text-sm">
          {GOOGLE_PLAY_IMAGE_TYPES.map((type) => <option key={type} value={type}>{t(`releaseConsole.imageTypes.${type}`)}</option>)}
        </select>
        <Input type="file" accept="image/png,image/jpeg" multiple onChange={(event) => onFiles(event.target.files)} disabled={busy === "upload"} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {snapshot.images.map((group) => (
          <div key={`${group.language}:${group.imageType}`} className="rounded-md border bg-surface p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ImageIcon className="h-4 w-4 text-primary" />
              {group.language} - {t(`releaseConsole.imageTypes.${group.imageType}`)}
            </div>
            {group.error ? <div className="mb-2 rounded-md border bg-muted p-2 text-xs text-on-surface-variant">{group.error}</div> : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.images.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-md border bg-background">
                  <img src={image.url} alt={image.id} className="h-28 w-full object-contain" />
                  <button type="button" onClick={() => onDeleteImage(image.id, group.language, group.imageType)} className="flex w-full items-center justify-center gap-1 border-t px-2 py-1 text-xs text-on-surface-variant">
                    <Trash2 className="h-3 w-3" />
                    {t("releaseConsole.actions.delete")}
                  </button>
                </div>
              ))}
              {!group.images.length ? <div className="flex items-center gap-2 text-xs text-on-surface-variant"><Upload className="h-3 w-3" />{t("releaseConsole.empty")}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
