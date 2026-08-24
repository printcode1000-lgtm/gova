"use client";

import { usePageSaveRegistration } from "@/features/page-save/ui";
import type { useOtaAdmin } from "./use-ota-admin";

type OtaAdmin = ReturnType<typeof useOtaAdmin>;

export function useOtaRolloutPageSave(
  ota: OtaAdmin,
  active: boolean,
  currentRollout: number | undefined,
): void {
  const isDirty =
    typeof currentRollout === "number" && ota.rollout !== currentRollout;

  usePageSaveRegistration({
    id: "release-console-ota-rollout",
    label: "نشر OTA",
    returnPath: "/dev/release-console?tab=ota-releases",
    enabled: active && Boolean(ota.dashboard?.current?.release) && isDirty,
    items: [
      {
        id: "ota-rollout",
        label: "نسبة النشر",
        isDirty,
        canSave: isDirty && !ota.busy,
      },
    ],
    isSaving: Boolean(ota.busy),
    canSave: isDirty && !ota.busy,
    save: async (selectedItemIds) => {
      if (!selectedItemIds.includes("ota-rollout")) return true;
      if (!ota.dashboard?.current.release) return false;
      await ota.changeApproval(ota.dashboard.current.release.approved);
      return true;
    },
  });
}
