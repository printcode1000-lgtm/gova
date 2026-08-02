"use client";

import { RotateCcw, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { GOOGLE_PLAY_IMAGE_TYPES, type GooglePlayImageType } from "../../domain/store-assets-types";
import { useStoreAssets } from "../../hooks/use-store-assets";

export function StoreImagesTab() {
  const { t } = useTranslation();
  const store = useStoreAssets();
  if (!store.snapshot) return <div className="p-4 text-sm">{t("releaseConsole.loading")}</div>;
  return (
    <section className="space-y-4">
      <div className="grid gap-3 rounded-md border bg-surface p-4 md:grid-cols-[10rem_14rem_1fr]">
        <Input value={store.language} onChange={(event) => store.setLanguage(event.target.value)} />
        <select className="h-10 rounded-md border bg-background px-3" value={store.imageType}
          onChange={(event) => store.setImageType(event.target.value as GooglePlayImageType)}>
          {GOOGLE_PLAY_IMAGE_TYPES.map((type) => (
            <option key={type} value={type}>{t(`releaseConsole.imageTypes.${type}`)}</option>
          ))}
        </select>
        <Input type="file" accept="image/png,image/jpeg" multiple
          onChange={(event) => void store.upload(event.target.files)} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {store.snapshot.images.map((group) => (
          <section key={`${group.language}:${group.imageType}`} className="rounded-md border bg-surface p-3">
            <h2 className="mb-2 text-sm font-semibold">
              {group.language} / {t(`releaseConsole.imageTypes.${group.imageType}`)}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.images.map((item) => (
                <figure key={item.id} className="overflow-hidden rounded-md border bg-background">
                  <img src={item.url} alt={item.id} className="h-28 w-full object-contain" />
                  <Button className="w-full" size="sm" variant="ghost"
                    onClick={() => void store.removeImage(item.id, group.language, group.imageType)}>
                    <Trash2 className="h-3 w-3" />{t("releaseConsole.actions.delete")}
                  </Button>
                </figure>
              ))}
              {!group.images.length ? <div className="flex gap-2 text-xs"><Upload className="h-4 w-4" />
                {t("releaseConsole.empty")}</div> : null}
            </div>
          </section>
        ))}
      </div>
      <section className="rounded-md border bg-surface p-4">
        <h2 className="mb-3 font-semibold">{t("releaseConsole.images.backups")}</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {(store.snapshot.backups ?? []).map((backup) => (
            <div key={backup.name} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
              <span className="min-w-0 truncate" dir="ltr">{backup.name}</span>
              <Button size="sm" variant="outline" onClick={() => void store.restore(backup.name)}>
                <RotateCcw className="h-4 w-4" />{t("releaseConsole.images.restore")}
              </Button>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
