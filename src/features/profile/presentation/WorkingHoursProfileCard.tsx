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
      <div id='features-profile-presentation-workinghoursprofilecard-div-1-itgwfz' className="py-10 text-center text-sm text-on-surface-variant">
        {locale === "ar" ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  return (
    <div id='features-profile-presentation-workinghoursprofilecard-div-2-furkme' className="space-y-4">
      {error ? (
        <div id='features-profile-presentation-workinghoursprofilecard-div-3-cawxlo' className="rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error}
        </div>
      ) : null}
      <WorkingHoursNoteCard id='features-profile-presentation-workinghoursprofilecard-workinghoursnotecard-4-ta9f9u'
        mode="edit"
        locale={locale === "ar" ? "ar" : "en"}
        note={details.workingHours.note}
        onChange={(note) =>
          updateField("workingHours", { ...details.workingHours, note })
        }
      />
      <WorkingHoursCard id='features-profile-presentation-workinghoursprofilecard-workinghourscard-5-dvyd3l'
        mode="edit"
        locale={locale === "ar" ? "ar" : "en"}
        value={details.workingHours}
        onChange={(workingHours) => updateField("workingHours", workingHours)}
      />
    </div>
  );
});

export default WorkingHoursProfileCard;
