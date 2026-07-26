"use client";

import * as React from "react";

import { WorkingHoursCard } from "@/components/ui/working-hours";
import { useStoreDetails } from "@/features/profile/hooks/use-store-details";
import type { StoreDetailsData } from "@/features/profile/entities/store-details.entity";
import { normalizeProfileWorkingHours } from "@/features/profile-working-hours";
import { useTranslation } from "@/lib/i18n";
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
  } = useStoreDetails();
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
      <div className="py-10 text-center text-sm text-on-surface-variant">
        {locale === "ar" ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error}
        </div>
      ) : null}
      <WorkingHoursCard
        mode="edit"
        locale={locale === "ar" ? "ar" : "en"}
        value={details.workingHours}
        onChange={(workingHours) => updateField("workingHours", workingHours)}
      />
    </div>
  );
});

export default WorkingHoursProfileCard;
