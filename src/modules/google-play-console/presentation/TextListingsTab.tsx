"use client";

import { Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { GooglePlayStoreAssetsSnapshot, GooglePlayStoreListing } from "../domain/store-assets-types";
import { diffText } from "./console-utils";

export function TextListingsTab({
  snapshot,
  details,
  listings,
  acknowledged,
  busy,
  t,
  onDetailsChange,
  onListingsChange,
  onAcknowledgeChange,
  onSave,
  onDeleteListing,
}: {
  snapshot: GooglePlayStoreAssetsSnapshot;
  details: GooglePlayStoreAssetsSnapshot["details"];
  listings: GooglePlayStoreListing[];
  acknowledged: boolean;
  busy: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onDetailsChange: (details: GooglePlayStoreAssetsSnapshot["details"]) => void;
  onListingsChange: (listings: GooglePlayStoreListing[]) => void;
  onAcknowledgeChange: (value: boolean) => void;
  onSave: () => void;
  onDeleteListing: (language: string) => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-3 rounded-md border bg-surface p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("releaseConsole.text.website")} value={details.contactWebsite ?? ""} onChange={(value) => onDetailsChange({ ...details, contactWebsite: value })} />
          <Field label={t("releaseConsole.text.email")} value={details.contactEmail ?? ""} onChange={(value) => onDetailsChange({ ...details, contactEmail: value })} />
          <Field label={t("releaseConsole.text.phone")} value={details.contactPhone ?? ""} onChange={(value) => onDetailsChange({ ...details, contactPhone: value })} />
          <Field label={t("releaseConsole.text.defaultLanguage")} value={details.defaultLanguage ?? ""} onChange={(value) => onDetailsChange({ ...details, defaultLanguage: value })} />
        </div>
        {listings.map((listing, index) => (
          <div key={`${listing.language}:${index}`} className="rounded-md border bg-muted p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{listing.language || t("releaseConsole.text.newLanguage")}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => onDeleteListing(listing.language)}>
                <Trash2 className="h-4 w-4" />
                {t("releaseConsole.actions.delete")}
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t("releaseConsole.text.language")} value={listing.language} onChange={(value) => patch(index, { language: value }, listings, onListingsChange)} />
              <Field label={t("releaseConsole.text.title")} value={listing.title ?? ""} onChange={(value) => patch(index, { title: value }, listings, onListingsChange)} />
              <Field label={t("releaseConsole.text.shortDescription")} value={listing.shortDescription ?? ""} onChange={(value) => patch(index, { shortDescription: value }, listings, onListingsChange)} />
              <Field label={t("releaseConsole.text.video")} value={listing.video ?? ""} onChange={(value) => patch(index, { video: value }, listings, onListingsChange)} />
            </div>
            <label className="mt-3 block text-xs text-on-surface-variant">{t("releaseConsole.text.fullDescription")}</label>
            <textarea value={listing.fullDescription ?? ""} onChange={(event) => patch(index, { fullDescription: event.target.value }, listings, onListingsChange)} className="mt-1 min-h-32 w-full rounded-md border bg-background p-3 text-sm" />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onListingsChange([...listings, { language: "en-US" }])}>{t("releaseConsole.text.addLanguage")}</Button>
          <Button type="button" onClick={onSave} disabled={!acknowledged || busy === "save"}>
            <Save className="h-4 w-4" />
            {t(busy === "save" ? "releaseConsole.actions.saving" : "releaseConsole.actions.save")}
          </Button>
        </div>
      </div>
      <aside className="rounded-md border bg-surface p-4">
        <div className="mb-2 text-sm font-semibold">{t("releaseConsole.text.pendingDiff")}</div>
        <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">{diffText(snapshot.listings, listings)}</pre>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledgeChange(event.target.checked)} />
          {t("releaseConsole.text.acknowledgeDiff")}
        </label>
      </aside>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1" />
    </label>
  );
}

function patch(index: number, next: Partial<GooglePlayStoreListing>, listings: GooglePlayStoreListing[], onChange: (listings: GooglePlayStoreListing[]) => void) {
  onChange(listings.map((listing, listingIndex) => listingIndex === index ? { ...listing, ...next } : listing));
}
