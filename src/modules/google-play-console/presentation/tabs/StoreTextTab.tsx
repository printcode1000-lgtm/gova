"use client";

import * as React from "react";
import { Plus, ListPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAdminArabic } from "@/lib/i18n/use-admin-arabic";
import { useStoreAssets } from "../../hooks/use-store-assets";
import type { GooglePlayStoreListing } from "../../domain/store-assets-types";
import { Field } from "../components/Field";
import { useStoreTextPageSave } from "../../hooks/use-store-text-page-save";

export function StoreTextTab() {
  const { t } = useAdminArabic();
  const store = useStoreAssets();
  const [acknowledged, setAcknowledged] = React.useState(false);
  useStoreTextPageSave(store, true, acknowledged);
  if (!store.snapshot) return <div className="p-4 text-sm">{t("releaseConsole.loading")}</div>;
  const patch = (index: number, next: Partial<GooglePlayStoreListing>) => {
    store.setListings(store.listings.map((item, itemIndex) => itemIndex === index ? { ...item, ...next } : item));
  };
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <div className="grid gap-3 rounded-md border bg-surface p-4 md:grid-cols-2">
          <Field label={t("releaseConsole.text.website")} value={store.details.contactWebsite ?? ""}
            onChange={(value) => store.setDetails({ ...store.details, contactWebsite: value })} />
          <Field label={t("releaseConsole.text.email")} value={store.details.contactEmail ?? ""}
            onChange={(value) => store.setDetails({ ...store.details, contactEmail: value })} />
          <Field label={t("releaseConsole.text.phone")} value={store.details.contactPhone ?? ""}
            onChange={(value) => store.setDetails({ ...store.details, contactPhone: value })} />
          <Field label={t("releaseConsole.text.defaultLanguage")} value={store.details.defaultLanguage ?? ""}
            onChange={(value) => store.setDetails({ ...store.details, defaultLanguage: value })} />
        </div>
        {store.listings.map((listing, index) => (
          <section key={`${listing.language}:${index}`} className="rounded-md border bg-surface p-4">
            <div className="mb-3 flex justify-between gap-2">
              <strong>{listing.language || t("releaseConsole.text.newLanguage")}</strong>
              <Button size="icon" variant="outline"
                aria-label={t("releaseConsole.actions.stageDelete")}
                onClick={() => store.stageListingDelete(listing.language)}>
                <ListPlus className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t("releaseConsole.text.language")} value={listing.language}
                onChange={(value) => patch(index, { language: value })} />
              <Field label={t("releaseConsole.text.title")} value={listing.title ?? ""}
                onChange={(value) => patch(index, { title: value })} />
              <Field label={t("releaseConsole.text.shortDescription")} value={listing.shortDescription ?? ""}
                onChange={(value) => patch(index, { shortDescription: value })} />
              <Field label={t("releaseConsole.text.video")} value={listing.video ?? ""}
                onChange={(value) => patch(index, { video: value })} />
            </div>
            <label className="mt-3 block text-xs text-on-surface-variant">
              {t("releaseConsole.text.fullDescription")}
            </label>
            <textarea className="mt-1 min-h-32 w-full rounded-md border bg-background p-3 text-sm"
              value={listing.fullDescription ?? ""}
              onChange={(event) => patch(index, { fullDescription: event.target.value })} />
          </section>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => store.setListings([...store.listings, { language: "en-US" }])}>
            <Plus className="h-4 w-4" />{t("releaseConsole.text.addLanguage")}
          </Button>
        </div>
      </div>
      <aside className="rounded-md border bg-surface p-4">
        <h2 className="text-sm font-semibold">{t("releaseConsole.text.pendingDiff")}</h2>
        <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
          {JSON.stringify({ before: store.snapshot.listings, after: store.listings }, null, 2)}
        </pre>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)} />
          {t("releaseConsole.text.acknowledgeDiff")}
        </label>
        {!acknowledged && store.isTextDirty ? (
          <p className="mt-2 text-xs text-on-surface-variant">
            {t("releaseConsole.text.acknowledgeDiff")}
          </p>
        ) : null}
      </aside>
    </section>
  );
}
