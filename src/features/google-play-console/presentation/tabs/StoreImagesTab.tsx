"use client";

import * as React from "react";
import { ListPlus, RotateCcw, Upload } from "lucide-react";

import Image from "next/image";
import { shouldUseUnoptimizedImage } from "@asol/storage-core";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { GOOGLE_PLAY_IMAGE_TYPES, type GooglePlayImageType } from "../../domain/store-assets-types";
import { useStoreAssets } from "../hooks/use-store-assets";
import { useStoreImagesPageSave } from "../hooks/use-store-images-page-save";

export function StoreImagesTab() {
  const { t } = useAdminArabic();
  const store = useStoreAssets();
  useStoreImagesPageSave(store, true);
  if (!store.snapshot)
    return (
      <div id='google-play-console-presentation-tabs-storeimagestab-div-1-yr4023' className="p-4 text-sm">
        {t("releaseConsole.loading")}
      </div>
    );
  return (
    <section id='google-play-console-presentation-tabs-storeimagestab-section-2-fr91bm' className="space-y-4">
      <div
        id='google-play-console-presentation-tabs-storeimagestab-div-3-pynyl0'
        className="grid gap-3 rounded-md border bg-surface p-4 md:grid-cols-[10rem_14rem_1fr]"
      >
        <Input
          id='google-play-console-presentation-tabs-storeimagestab-input-4-08hfar'
          value={store.language}
          onChange={(event) => store.setLanguage(event.target.value)}
        />
        <select
          id='google-play-console-presentation-tabs-storeimagestab-select-5-meruhf'
          className="h-10 rounded-md border bg-background px-3"
          value={store.imageType}
          onChange={(event) => store.setImageType(event.target.value as GooglePlayImageType)}
        >
          {GOOGLE_PLAY_IMAGE_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`releaseConsole.imageTypes.${type}`)}
            </option>
          ))}
        </select>
        <Input
          id='google-play-console-presentation-tabs-storeimagestab-input-6-6pqtsw'
          type="file"
          accept="image/png,image/jpeg"
          multiple
          onChange={(event) => store.queueUpload(event.target.files)}
        />
      </div>
      {store.stagedUploads.length > 0 ? (
        <p id='google-play-console-presentation-tabs-storeimagestab-text-7-829xxn' className="text-sm text-on-surface-variant">
          {store.stagedUploads.length} صورة مجهزة.
        </p>
      ) : null}
      <div id='google-play-console-presentation-tabs-storeimagestab-div-8-mubgat' className="grid gap-3 md:grid-cols-2">
        {store.snapshot.images.map((group) => (
          <section key={`${group.language}:${group.imageType}`} className="rounded-md border bg-surface p-3">
            <h2 className="mb-2 text-sm font-semibold">
              {group.language} / {t(`releaseConsole.imageTypes.${group.imageType}`)}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.images.map((item) => (
                <figure key={item.id} className="overflow-hidden rounded-md border bg-background">
                  <StoreImagePreview
                    id={item.id}
                    url={item.url}
                    unavailableLabel={t("releaseConsole.images.unavailable")}
                  />
                  <Button
                    className="w-full"
                    size="sm"
                    variant="ghost"
                    onClick={() => store.stageImageDelete(item.id, group.language, group.imageType)}
                  >
                    <ListPlus className="h-3 w-3" />
                    {t("releaseConsole.actions.stageDelete")}
                  </Button>
                </figure>
              ))}
              {!group.images.length ? (
                <div className="flex gap-2 text-xs">
                  <Upload className="h-4 w-4" />
                  {t("releaseConsole.empty")}
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
      <section id='google-play-console-presentation-tabs-storeimagestab-section-9-8rjmji' className="rounded-md border bg-surface p-4">
        <h2 id='google-play-console-presentation-tabs-storeimagestab-heading-10-utsg9j' className="mb-3 font-semibold">
          {t("releaseConsole.images.backups")}
        </h2>
        <div id='google-play-console-presentation-tabs-storeimagestab-div-11-yxt6nn' className="grid gap-2 md:grid-cols-2">
          {(store.snapshot.backups ?? []).map((backup) => (
            <div key={backup.name} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
              <span className="min-w-0 truncate" dir="ltr">
                {backup.name}
              </span>
              <Button size="sm" variant="outline" onClick={() => store.stageBackupRestore(backup.name)}>
                <RotateCcw className="h-4 w-4" />
                {t("releaseConsole.images.restore")}
              </Button>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function StoreImagePreview(props: { id: string; url: string; unavailableLabel: string } & { id?: string }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <div
        id={props.id}
        className="flex h-28 items-center justify-center bg-muted px-2 text-center text-xs text-on-surface-variant"
      >
        {props.unavailableLabel}
      </div>
    );
  }
  return (
    <div id={props.id} className="relative h-28 w-full">
      <Image
        src={props.url}
        alt={props.id}
        fill
        sizes="224px"
        referrerPolicy="no-referrer"
        className="object-contain"
        unoptimized={shouldUseUnoptimizedImage(props.url)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
