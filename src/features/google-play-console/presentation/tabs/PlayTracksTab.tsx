"use client";

import * as React from "react";
import { ArrowRight, FileUp } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import type { GooglePlayTrackName } from "../../domain/store-assets-types";
import { usePlayTracks } from "../../hooks/use-play-tracks";
import { usePlayTracksPageSave } from "../../hooks/use-play-tracks-page-save";

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
  if (!tracks.snapshot) return <div className="p-4 text-sm">{t("releaseConsole.loading")}</div>;
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
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(tracks.snapshot.tracks ?? []).map((item) => (
          <div key={item.track} className="rounded-md border bg-surface p-3">
            <h2 className="font-semibold" dir="ltr">{item.track}</h2>
            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs" dir="ltr">
              {JSON.stringify(item.releases, null, 2)}
            </pre>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-md border bg-surface p-4">
          <h2 className="font-semibold">{t("releaseConsole.tracks.update")}</h2>
          <TrackSelect value={track} onChange={setTrack} />
          <Input value={versionCode} onChange={(event) => setVersionCode(event.target.value)}
            placeholder={t("releaseConsole.tracks.versionCode")} dir="ltr" />
          <select className="h-10 w-full rounded-md border bg-background px-3" value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}>
            {(["draft", "inProgress", "halted", "completed"] as const).map((value) => (
              <option key={value} value={value}>{t(`releaseConsole.tracks.status.${value}`)}</option>
            ))}
          </select>
          <Input type="number" min="0" max="1" step="0.05" value={fraction}
            onChange={(event) => setFraction(event.target.value)}
            placeholder={t("releaseConsole.tracks.rollout")} />
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)}
            placeholder={t("releaseConsole.tracks.changelog")} />
        </section>
        <section className="space-y-3 rounded-md border bg-surface p-4">
          <h2 className="font-semibold">{t("releaseConsole.tracks.promote")}</h2>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <TrackSelect value={fromTrack} onChange={setFromTrack} />
            <ArrowRight className="h-4 w-4" />
            <TrackSelect value={toTrack} onChange={setToTrack} />
          </div>
          <Button disabled={!versionCode || tracks.busy} onClick={() => void promote()}>
            {t("releaseConsole.tracks.promote")}
          </Button>
          <label className="block border-t pt-3 text-sm">
            <span className="mb-2 flex items-center gap-2 font-medium"><FileUp className="h-4 w-4" />
              {t("releaseConsole.tracks.mapping")}</span>
            <Input type="file" accept="text/plain" onChange={(event) => void mapping(event.target.files)} />
          </label>
        </section>
      </div>
    </section>
  );
}

function TrackSelect({ value, onChange }: {
  value: GooglePlayTrackName;
  onChange: (value: GooglePlayTrackName) => void;
}) {
  return (
    <select className="h-10 w-full rounded-md border bg-background px-3" value={value}
      onChange={(event) => onChange(event.target.value as GooglePlayTrackName)} dir="ltr">
      {TRACKS.map((item) => <option key={item}>{item}</option>)}
    </select>
  );
}
