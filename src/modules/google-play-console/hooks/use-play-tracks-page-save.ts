"use client";

import { usePageSaveRegistration } from "@/features/page-save/hooks/use-page-save-registration";
import { buildPageSaveOperationDescription } from "@/features/page-save/utils/page-save-operation-description";
import type { usePlayTracks } from "./use-play-tracks";
import { useTranslation } from "@/lib/i18n";

type PlayTracks = ReturnType<typeof usePlayTracks>;

export function usePlayTracksPageSave(
  tracks: PlayTracks,
  active: boolean,
  input: {
    track: string;
    versionCode: string;
    status: string;
    fraction: string;
    notes: string;
    onUpdate: () => Promise<boolean>;
  },
): void {
  const { t } = useTranslation();
  const isDirty = Boolean(
    input.versionCode.trim() ||
      input.notes.trim() ||
      input.fraction.trim() ||
      input.status !== "draft",
  );

  usePageSaveRegistration({
    id: "release-console-play-tracks",
    label: "مسارات Google Play",
    returnPath: "/dev/release-console?tab=play-tracks",
    enabled: active && Boolean(tracks.snapshot) && isDirty,
    items: [
      {
        id: "play-track-update",
        label: `تحديث مسار ${input.track}`,
        isDirty,
        canSave: isDirty && !tracks.busy,
        description: buildPageSaveOperationDescription(t, ["save"]),
      },
    ],
    isSaving: Boolean(tracks.busy),
    canSave: isDirty && !tracks.busy,
    save: async (selectedItemIds) => {
      if (!selectedItemIds.includes("play-track-update")) return true;
      return input.onUpdate();
    },
  });
}
