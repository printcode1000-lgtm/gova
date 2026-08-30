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
import { uiAttributes , createOpaqueUiInstanceId, composeUiInstanceId} from "@asol/ui-registry-core";

export function StoreImagesTab() {
  const { t } = useAdminArabic();
  const store = useStoreAssets();
  useStoreImagesPageSave(store, true);
  if (!store.snapshot) return <div {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.div.5-f3trI1", id: "google-play-console.tabs.store-images-tab.div.5" })} id="google-play-console.tabs.store-images-tab.div" className="p-4 text-sm">{t("releaseConsole.loading")}</div>;
  return (
    <section {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.section.3-vN4Xku", id: "google-play-console.tabs.store-images-tab.section.3" })} id="google-play-console.tabs.store-images-tab.section" className="space-y-4">
      <div {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.div.6-G03NPe", id: "google-play-console.tabs.store-images-tab.div.6" })} id="google-play-console.tabs.store-images-tab.div.2" className="grid gap-3 rounded-md border bg-surface p-4 md:grid-cols-[10rem_14rem_1fr]">
        <Input id="google-play-console.tabs.store-images-tab.input"
          ui={{
            uid: "release-console.store-images.language-8GGWPc",
            id: "release-console.store-images.language",
            kind: "field",
            part: "toolbar",
          }} value={store.language} onChange={(event) => store.setLanguage(event.target.value)} />
        <select {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.select.2-QzHD5V", id: "google-play-console.tabs.store-images-tab.select.2" })} id="google-play-console.tabs.store-images-tab.select"
          className="h-10 rounded-md border bg-background px-3"
          value={store.imageType}
          onChange={(event) => store.setImageType(event.target.value as GooglePlayImageType)}
        >
          {GOOGLE_PLAY_IMAGE_TYPES.map((type) => (
            <option key={type} {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.option-w694O3", id: "google-play-console.tabs.store-images-tab.option" , instance: createOpaqueUiInstanceId("iter-f4354e730d", String(type))})} value={type}>{t(`releaseConsole.imageTypes.${type}`)}</option>
          ))}
        </select>
        <Input id="google-play-console.tabs.store-images-tab.input.2"
          ui={{
            uid: "release-console.store-images.upload-d8TGuM",
            id: "release-console.store-images.upload",
            kind: "field",
            part: "upload",
          }}
          type="file"
          accept="image/png,image/jpeg"
          multiple
          onChange={(event) => store.queueUpload(event.target.files)}
        />
      </div>
      {store.stagedUploads.length > 0 ? (
        <p {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.p.2-1jCAwJ", id: "google-play-console.tabs.store-images-tab.p.2" })} id="google-play-console.tabs.store-images-tab.p" className="text-sm text-on-surface-variant">
          {store.stagedUploads.length} صورة مجهزة.
        </p>
      ) : null}
      <div {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.div.7-8DW3Wp", id: "google-play-console.tabs.store-images-tab.div.7" })} id="google-play-console.tabs.store-images-tab.div.3" className="grid gap-3 md:grid-cols-2">
        {store.snapshot.images.map((group) => (
          <section key={`${group.language}:${group.imageType}`} {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.section.4-R6Aq6U", id: "google-play-console.tabs.store-images-tab.section.4" , instance: createOpaqueUiInstanceId("iter-24de0baa8f", String(`${group.language}:${group.imageType}`))})} className="rounded-md border bg-surface p-3">
            <h2 {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.h2.2-RRG40v", id: "google-play-console.tabs.store-images-tab.h2.2" , instance: createOpaqueUiInstanceId("iter-e5718d5e41", String(`${group.language}:${group.imageType}`))})} className="mb-2 text-sm font-semibold">
              {group.language} / {t(`releaseConsole.imageTypes.${group.imageType}`)}
            </h2>
            <div {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.div.8-e2MZMy", id: "google-play-console.tabs.store-images-tab.div.8" , instance: createOpaqueUiInstanceId("iter-9f713b5d1e", String(`${group.language}:${group.imageType}`))})} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.images.map((item) => (
                <figure key={item.id} {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.figure-FABN6g", id: "google-play-console.tabs.store-images-tab.figure" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-ff2f13afea", String(item.id)), createOpaqueUiInstanceId("iter-02ad044942", String(item.id)))})} className="overflow-hidden rounded-md border bg-background">
                  <StoreImagePreview
                    id={item.id}
                    url={item.url}
                    unavailableLabel={t("releaseConsole.images.unavailable")}
                  />
                  <Button ui={{ uid: "google-play-console.tabs.store-images-tab.button-w0XGxc", id: "google-play-console.tabs.store-images-tab.button" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-7baea23c0b", String(item.id)), createOpaqueUiInstanceId("iter-620fe8010c", String(item.id)))}}
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
                <div {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.div.9-g5Mw5V", id: "google-play-console.tabs.store-images-tab.div.9" , instance: createOpaqueUiInstanceId("iter-e76c0607f0", String(`${group.language}:${group.imageType}`))})} className="flex gap-2 text-xs">
                  <Upload className="h-4 w-4" />
                  {t("releaseConsole.empty")}
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
      <section {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.section.5-H9GFeM", id: "google-play-console.tabs.store-images-tab.section.5" })} id="google-play-console.tabs.store-images-tab.section.2" className="rounded-md border bg-surface p-4">
        <h2 {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.h2.3-94YvOL", id: "google-play-console.tabs.store-images-tab.h2.3" })} id="google-play-console.tabs.store-images-tab.h2" className="mb-3 font-semibold">{t("releaseConsole.images.backups")}</h2>
        <div {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.div.10-VGtSD5", id: "google-play-console.tabs.store-images-tab.div.10" })} id="google-play-console.tabs.store-images-tab.div.4" className="grid gap-2 md:grid-cols-2">
          {(store.snapshot.backups ?? []).map((backup) => (
            <div key={backup.name} {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.div.11-H1S2h5", id: "google-play-console.tabs.store-images-tab.div.11" , instance: createOpaqueUiInstanceId("iter-6705cfed95", String(backup.name))})} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
              <span {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.span-BN4i7L", id: "google-play-console.tabs.store-images-tab.span" , instance: createOpaqueUiInstanceId("iter-8c0c5be90c", String(backup.name))})} className="min-w-0 truncate" dir="ltr">{backup.name}</span>
              <Button ui={{ uid: "google-play-console.tabs.store-images-tab.button.2-75EGgf", id: "google-play-console.tabs.store-images-tab.button.2" , instance: createOpaqueUiInstanceId("iter-907dceb76b", String(backup.name))}}
                size="sm"
                variant="outline"
                onClick={() => store.stageBackupRestore(backup.name)}
              >
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
      <div {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.div.12-G59955", id: "google-play-console.tabs.store-images-tab.div.12" })} id={props.id}
        className="flex h-28 items-center justify-center bg-muted px-2 text-center text-xs text-on-surface-variant"
      >
        {props.unavailableLabel}
      </div>
    );
  }
  return (
    <div {...uiAttributes({ uid: "google-play-console.tabs.store-images-tab.div.13-SpYIA6", id: "google-play-console.tabs.store-images-tab.div.13" })} id={props.id} className="relative h-28 w-full">
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
