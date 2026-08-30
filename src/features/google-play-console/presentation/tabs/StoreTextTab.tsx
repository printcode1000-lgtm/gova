"use client";

import * as React from "react";
import { Plus, ListPlus } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { useStoreAssets } from "../hooks/use-store-assets";
import type { GooglePlayStoreListing } from "../../domain/store-assets-types";
import { Field } from "../components/Field";
import { useStoreTextPageSave } from "../hooks/use-store-text-page-save";
import { createOpaqueUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

export function StoreTextTab() {
  const { t } = useAdminArabic();
  const store = useStoreAssets();
  const [acknowledged, setAcknowledged] = React.useState(false);
  useStoreTextPageSave(store, true, acknowledged);
  if (!store.snapshot) return <div {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.div.5-h3PgS6", id: "google-play-console.tabs.store-text-tab.div.5" })} id="google-play-console.tabs.store-text-tab.div" className="p-4 text-sm">{t("releaseConsole.loading")}</div>;
  const patch = (index: number, next: Partial<GooglePlayStoreListing>) => {
    store.setListings(store.listings.map((item, itemIndex) => itemIndex === index ? { ...item, ...next } : item));
  };
  return (
    <section {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.section.2-hLuD91", id: "google-play-console.tabs.store-text-tab.section.2" })} id="google-play-console.tabs.store-text-tab.section" className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <div {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.div.6-MO9Azg", id: "google-play-console.tabs.store-text-tab.div.6" })} id="google-play-console.tabs.store-text-tab.div.2" className="space-y-4">
        <div {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.div.7-B5sdi7", id: "google-play-console.tabs.store-text-tab.div.7" })} id="google-play-console.tabs.store-text-tab.div.3" className="grid gap-3 rounded-md border bg-surface p-4 md:grid-cols-2">
          <Field id="google-play-console.tabs.store-text-tab.field" label={t("releaseConsole.text.website")} value={store.details.contactWebsite ?? ""}
            onChange={(value) => store.setDetails({ ...store.details, contactWebsite: value })} />
          <Field id="google-play-console.tabs.store-text-tab.field.2" label={t("releaseConsole.text.email")} value={store.details.contactEmail ?? ""}
            onChange={(value) => store.setDetails({ ...store.details, contactEmail: value })} />
          <Field id="google-play-console.tabs.store-text-tab.field.3" label={t("releaseConsole.text.phone")} value={store.details.contactPhone ?? ""}
            onChange={(value) => store.setDetails({ ...store.details, contactPhone: value })} />
          <Field id="google-play-console.tabs.store-text-tab.field.4" label={t("releaseConsole.text.defaultLanguage")} value={store.details.defaultLanguage ?? ""}
            onChange={(value) => store.setDetails({ ...store.details, defaultLanguage: value })} />
        </div>
        {store.listings.map((listing, index) => {
          const listingInstance = createOpaqueUiInstanceId("store-listing", `${listing.language}:${index}`);
          return (
            <section key={`${listing.language}:${index}`} {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.section.3-N2sN6n", id: "google-play-console.tabs.store-text-tab.section.3", instance: listingInstance })} className="rounded-md border bg-surface p-4">
              <div {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.div.8-TBG7H3", id: "google-play-console.tabs.store-text-tab.div.8", instance: listingInstance })} className="mb-3 flex justify-between gap-2">
                <strong {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.strong-C7S3At", id: "google-play-console.tabs.store-text-tab.strong", instance: listingInstance })}>{listing.language || t("releaseConsole.text.newLanguage")}</strong>
                <Button ui={{ uid: "google-play-console.tabs.store-text-tab.button.2-F6YCSK", id: "google-play-console.tabs.store-text-tab.button.2", instance: listingInstance }} size="icon" variant="outline"
                  aria-label={t("releaseConsole.actions.stageDelete")}
                  onClick={() => store.stageListingDelete(listing.language)}>
                  <ListPlus className="h-4 w-4" />
                </Button>
              </div>
              <div {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.div.9-JKCt25", id: "google-play-console.tabs.store-text-tab.div.9", instance: listingInstance })} className="grid gap-3 md:grid-cols-2">
                <Field label={t("releaseConsole.text.language")} value={listing.language}
                  onChange={(value) => patch(index, { language: value })} />
                <Field label={t("releaseConsole.text.title")} value={listing.title ?? ""}
                  onChange={(value) => patch(index, { title: value })} />
                <Field label={t("releaseConsole.text.shortDescription")} value={listing.shortDescription ?? ""}
                  onChange={(value) => patch(index, { shortDescription: value })} />
                <Field label={t("releaseConsole.text.video")} value={listing.video ?? ""}
                  onChange={(value) => patch(index, { video: value })} />
              </div>
              <label {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.label.2-y2tnQ5", id: "google-play-console.tabs.store-text-tab.label.2", instance: listingInstance })} className="mt-3 block text-xs text-on-surface-variant">
                {t("releaseConsole.text.fullDescription")}
              </label>
              <textarea {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.textarea-9Tbjwh", id: "google-play-console.tabs.store-text-tab.textarea", instance: listingInstance })} className="mt-1 min-h-32 w-full rounded-md border bg-background p-3 text-sm"
                value={listing.fullDescription ?? ""}
                onChange={(event) => patch(index, { fullDescription: event.target.value })} />
            </section>
          );
        })}
        <div {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.div.10-FPsN6J", id: "google-play-console.tabs.store-text-tab.div.10" })} id="google-play-console.tabs.store-text-tab.div.4" className="flex gap-2">
          <Button id="google-play-console.tabs.store-text-tab.button"
            ui={{
              uid: "release-console.store-text.add-language-sI0y21",
              id: "release-console.store-text.add-language",
              kind: "action",
              action: "add-listing-language",
              part: "footer",
            }} variant="outline" onClick={() => store.setListings([...store.listings, { language: "en-US" }])}>
            <Plus id="google-play-console.tabs.store-text-tab.plus" className="h-4 w-4" />{t("releaseConsole.text.addLanguage")}
          </Button>
        </div>
      </div>
      <aside {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.aside.2-Xd8LJ0", id: "google-play-console.tabs.store-text-tab.aside.2" })} id="google-play-console.tabs.store-text-tab.aside" className="rounded-md border bg-surface p-4">
        <h2 {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.h2.2-sU03s6", id: "google-play-console.tabs.store-text-tab.h2.2" })} id="google-play-console.tabs.store-text-tab.h2" className="text-sm font-semibold">{t("releaseConsole.text.pendingDiff")}</h2>
        <pre {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.pre-o7ztmX", id: "google-play-console.tabs.store-text-tab.pre" })} className="mt-2 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
          {JSON.stringify({ before: store.snapshot.listings, after: store.listings }, null, 2)}
        </pre>
        <label {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.label.3-YUX0JT", id: "google-play-console.tabs.store-text-tab.label.3" })} id="google-play-console.tabs.store-text-tab.label" className="mt-3 flex items-center gap-2 text-sm">
          <input {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.input.2-7yK9OR", id: "google-play-console.tabs.store-text-tab.input.2" })} id="google-play-console.tabs.store-text-tab.input" type="checkbox" checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)} />
          {t("releaseConsole.text.acknowledgeDiff")}
        </label>
        {!acknowledged && store.isTextDirty ? (
          <p {...uiAttributes({ uid: "google-play-console.tabs.store-text-tab.p.2-0DYF17", id: "google-play-console.tabs.store-text-tab.p.2" })} id="google-play-console.tabs.store-text-tab.p" className="mt-2 text-xs text-on-surface-variant">
            {t("releaseConsole.text.acknowledgeDiff")}
          </p>
        ) : null}
      </aside>
    </section>
  );
}
