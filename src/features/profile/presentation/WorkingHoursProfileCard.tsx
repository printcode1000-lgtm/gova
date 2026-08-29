"use client";

import * as React from "react";

import {
  WorkingHoursCard,
  WorkingHoursNoteCard,
} from "@/features/profile-working-hours/ui";
import { useStoreDetails } from "@/features/profile/presentation/hooks/use-store-details";
import type { StoreDetailsData } from "@/features/profile/domain/store-details.entity";
import { normalizeProfileWorkingHours } from "@/features/profile-working-hours";
import { useTranslation } from "@/shared/i18n";
import type {
  ProfileSectionStatus,
  StoreDetailsController,
} from "./profile-save-controller";
import { uiAttributes } from "@asol/ui-registry-core";

interface WorkingHoursProfileCardProps {
  onStatusChange?: (status: ProfileSectionStatus) => void;
}

export const WorkingHoursProfileCard = React.forwardRef<
  StoreDetailsController,
  WorkingHoursProfileCardProps
>(function WorkingHoursProfileCard({ onStatusChange }, ref) {
  const { locale } = useTranslation();
  const {
    details,
    updateField,
    isDirty,
    isLoading,
    isSaving,
    error,
    saveAsync,
    applySaved,
  } = useStoreDetails(undefined, undefined, { ignoreStoreNameDirty: true });
  const label = locale === "ar" ? "مواعيد العمل" : "Working hours";

  React.useImperativeHandle(
    ref,
    () => ({
      isDirty,
      isSaving,
      canSave: true,
      label,
      save: saveAsync,
      getSnapshot: () => ({
        ...details,
        workingHours: normalizeProfileWorkingHours(details.workingHours),
      }),
      applySaved: (saved: StoreDetailsData) => applySaved(saved),
    }),
    [applySaved, details, isDirty, isSaving, label, saveAsync],
  );

  React.useEffect(() => {
    onStatusChange?.({ isDirty, isSaving, canSave: true, label });
  }, [isDirty, isSaving, label, onStatusChange]);

  if (isLoading) {
    return (
      <div {...uiAttributes({ uid: "profile.working-hours-profile-card.div.4-ZH9M9C", id: "profile.working-hours-profile-card.div.4" })} id="profile.working-hours-profile-card.div" className="py-10 text-center text-sm text-on-surface-variant">
        {locale === "ar" ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  return (
    <div {...uiAttributes({ uid: "profile.working-hours-profile-card.div.5-u4XmLD", id: "profile.working-hours-profile-card.div.5" })} id="profile.working-hours-profile-card.div.2" className="space-y-4">
      {error ? (
        <div {...uiAttributes({ uid: "profile.working-hours-profile-card.div.6-Z17CD2", id: "profile.working-hours-profile-card.div.6" })} id="profile.working-hours-profile-card.div.3" className="rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error}
        </div>
      ) : null}
      <WorkingHoursNoteCard id="profile.working-hours-profile-card.working-hours-note-card"
        mode="edit"
        locale={locale === "ar" ? "ar" : "en"}
        note={details.workingHours.note}
        onChange={(note) =>
          updateField("workingHours", { ...details.workingHours, note })
        }
      />
      <WorkingHoursCard id="profile.working-hours-profile-card.working-hours-card"
        mode="edit"
        locale={locale === "ar" ? "ar" : "en"}
        value={details.workingHours}
        onChange={(workingHours) => updateField("workingHours", workingHours)}
      />
    </div>
  );
});

export default WorkingHoursProfileCard;
