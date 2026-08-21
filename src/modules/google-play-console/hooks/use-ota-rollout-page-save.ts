"use client";

import { usePageSaveRegistration } from "@/features/page-save/hooks/use-page-save-registration";
import { buildPageSaveOperationDescription } from "@/features/page-save/utils/page-save-operation-description";
import type { useOtaAdmin } from "./use-ota-admin";
import { useTranslation } from "@/lib/i18n";

type OtaAdmin = ReturnType<typeof useOtaAdmin>;

export function useOtaRolloutPageSave(
  ota: OtaAdmin,
  active: boolean,
  currentRollout: number | undefined,
): void {
  const { t } = useTranslation();
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
        description: buildPageSaveOperationDescription(t, ["save"]),
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
