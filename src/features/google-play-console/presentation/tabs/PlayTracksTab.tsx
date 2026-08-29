"use client";

import * as React from "react";
import { ArrowRight, FileUp } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import type { GooglePlayTrackName } from "../../domain/store-assets-types";
import { usePlayTracks } from "../hooks/use-play-tracks";
import { usePlayTracksPageSave } from "../hooks/use-play-tracks-page-save";
import { uiAttributes } from "@asol/ui-registry-core";

const TRACKS: GooglePlayTrackName[] = ["internal", "alpha", "beta", "production"];

export function PlayTracksTab() {
  const { t } = useAdminArabic();
  const tracks = usePlayTracks();
  const [track, setTrack] = React.useState<GooglePlayTrackName>("internal");
  const [fromTrack, setFromTrack] = React.useState<GooglePlayTrackName>("internal");
  const [toTrack, setToTrack] = React.useState<GooglePlayTrackName>("alpha");
  const [versionCode, setVersionCode] = React.useState("");
  const [status, setStatus] = React.useState<"draft" | "inProgress" | "halted" | "completed">("draft");
  const [fraction, setFraction] = React.useState("");
  const [notes, setNotes] = React.useState("");
  if (!tracks.snapshot) return <div {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.div.5-P5d0T3", id: "google-play-console.tabs.play-tracks-tab.div.5" })} id="google-play-console.tabs.play-tracks-tab.div" className="p-4 text-sm">{t("releaseConsole.loading")}</div>;
  const releaseNotes = notes ? [{ language: "en-US", text: notes }] : undefined;
  const update = async () => {
    return tracks.update({
      track,
      release: {
        versionCodes: versionCode ? [versionCode] : [],
        status,
        userFraction: fraction ? Number(fraction) : undefined,
        releaseNotes,
      },
    });
  };
  usePlayTracksPageSave(tracks, true, {
    track,
    versionCode,
    status,
    fraction,
    notes,
    onUpdate: update,
  });
  const promote = async () =>
    tracks.promote({ fromTrack, toTrack, versionCode, releaseNotes });
  const mapping = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return false;
    const form = new FormData();
    form.set("versionCode", versionCode);
    form.set("file", file);
    return tracks.uploadMapping(form);
  };
  return (
    <section {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.section.4-OW8Crg", id: "google-play-console.tabs.play-tracks-tab.section.4" })} id="google-play-console.tabs.play-tracks-tab.section" className="space-y-4">
      <div {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.div.6-34zyDO", id: "google-play-console.tabs.play-tracks-tab.div.6" })} id="google-play-console.tabs.play-tracks-tab.div.2" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(tracks.snapshot.tracks ?? []).map((item) => (
          <div key={item.track} {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.div.7-KKTDL1", id: "google-play-console.tabs.play-tracks-tab.div.7" })} className="rounded-md border bg-surface p-3">
            <h2 {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.h2.3-Q9DI4n", id: "google-play-console.tabs.play-tracks-tab.h2.3" })} className="font-semibold" dir="ltr">{item.track}</h2>
            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs" dir="ltr">
              {JSON.stringify(item.releases, null, 2)}
            </pre>
          </div>
        ))}
      </div>
      <div {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.div.8-6L15gc", id: "google-play-console.tabs.play-tracks-tab.div.8" })} id="google-play-console.tabs.play-tracks-tab.div.3" className="grid gap-4 lg:grid-cols-2">
        <section {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.section.5-JCC7JY", id: "google-play-console.tabs.play-tracks-tab.section.5" })} id="google-play-console.tabs.play-tracks-tab.section.2" className="space-y-3 rounded-md border bg-surface p-4">
          <h2 {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.h2.4-WT9V0L", id: "google-play-console.tabs.play-tracks-tab.h2.4" })} id="google-play-console.tabs.play-tracks-tab.h2" className="font-semibold">{t("releaseConsole.tracks.update")}</h2>
          <TrackSelect id="google-play-console.tabs.play-tracks-tab.track-select" value={track} onChange={setTrack} />
          <Input id="google-play-console.tabs.play-tracks-tab.input"
            ui={{
              uid: "release-console.tracks.version-code-A2cEvY",
              id: "release-console.tracks.version-code",
              kind: "field",
              part: "form",
            }} value={versionCode} onChange={(event) => setVersionCode(event.target.value)}
            placeholder={t("releaseConsole.tracks.versionCode")} dir="ltr" />
          <select {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.select.2-N2PQMl", id: "google-play-console.tabs.play-tracks-tab.select.2" })} id="google-play-console.tabs.play-tracks-tab.select" className="h-10 w-full rounded-md border bg-background px-3" value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}>
            {(["draft", "inProgress", "halted", "completed"] as const).map((value) => (
              <option key={value} {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.option-O0Flg8", id: "google-play-console.tabs.play-tracks-tab.option" })} value={value}>{t(`releaseConsole.tracks.status.${value}`)}</option>
            ))}
          </select>
          <Input id="google-play-console.tabs.play-tracks-tab.input.2"
            ui={{
              uid: "release-console.tracks.rollout-fraction-WPgf15",
              id: "release-console.tracks.rollout-fraction",
              kind: "field",
              part: "form",
            }} type="number" min="0" max="1" step="0.05" value={fraction}
            onChange={(event) => setFraction(event.target.value)}
            placeholder={t("releaseConsole.tracks.rollout")} />
          <Textarea id="google-play-console.tabs.play-tracks-tab.textarea"
            ui={{
              uid: "release-console.tracks.changelog-8W3PHm",
              id: "release-console.tracks.changelog",
              kind: "field",
              part: "form",
            }} value={notes} onChange={(event) => setNotes(event.target.value)}
            placeholder={t("releaseConsole.tracks.changelog")} />
        </section>
        <section {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.section.6-ZR0I34", id: "google-play-console.tabs.play-tracks-tab.section.6" })} id="google-play-console.tabs.play-tracks-tab.section.3" className="space-y-3 rounded-md border bg-surface p-4">
          <h2 {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.h2.5-CWd65i", id: "google-play-console.tabs.play-tracks-tab.h2.5" })} id="google-play-console.tabs.play-tracks-tab.h2.2" className="font-semibold">{t("releaseConsole.tracks.promote")}</h2>
          <div {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.div.9-HqVg1W", id: "google-play-console.tabs.play-tracks-tab.div.9" })} id="google-play-console.tabs.play-tracks-tab.div.4" className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <TrackSelect id="google-play-console.tabs.play-tracks-tab.track-select.2" value={fromTrack} onChange={setFromTrack} />
            <ArrowRight id="google-play-console.tabs.play-tracks-tab.arrow-right" className="h-4 w-4" />
            <TrackSelect id="google-play-console.tabs.play-tracks-tab.track-select.3" value={toTrack} onChange={setToTrack} />
          </div>
          <Button id="google-play-console.tabs.play-tracks-tab.button"
            ui={{
              uid: "release-console.tracks.promote-f6y1cZ",
              id: "release-console.tracks.promote",
              kind: "action",
              action: "promote-track",
              part: "actions",
            }} disabled={!versionCode || tracks.busy} onClick={() => void promote()}>
            {t("releaseConsole.tracks.promote")}
          </Button>
          <label {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.label.2-9JcGZQ", id: "google-play-console.tabs.play-tracks-tab.label.2" })} id="google-play-console.tabs.play-tracks-tab.label" className="block border-t pt-3 text-sm">
            <span {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.span.2-7RdKYH", id: "google-play-console.tabs.play-tracks-tab.span.2" })} id="google-play-console.tabs.play-tracks-tab.span" className="mb-2 flex items-center gap-2 font-medium"><FileUp id="google-play-console.tabs.play-tracks-tab.file-up" className="h-4 w-4" />
              {t("releaseConsole.tracks.mapping")}</span>
            <Input id="google-play-console.tabs.play-tracks-tab.input.3"
              ui={{
                uid: "release-console.tracks.mapping-file-5IDV0f",
                id: "release-console.tracks.mapping-file",
                kind: "field",
                part: "actions",
              }} type="file" accept="text/plain" onChange={(event) => void mapping(event.target.files)} />
          </label>
        </section>
      </div>
    </section>
  );
}

function TrackSelect({ id, value, onChange }: {
  value: GooglePlayTrackName;
  onChange: (value: GooglePlayTrackName) => void;
} & { id?: string }) {
  return (
    <select {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.select.3-msH3LN", id: "google-play-console.tabs.play-tracks-tab.select.3" })} id={id} className="h-10 w-full rounded-md border bg-background px-3" value={value}
      onChange={(event) => onChange(event.target.value as GooglePlayTrackName)} dir="ltr">
      {TRACKS.map((item) => <option key={item} {...uiAttributes({ uid: "google-play-console.tabs.play-tracks-tab.option.2-8MYxUo", id: "google-play-console.tabs.play-tracks-tab.option.2" })}>{item}</option>)}
    </select>
  );
}
