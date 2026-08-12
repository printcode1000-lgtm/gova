"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
faBuilding,
faCircleCheck,
faClock,
faComments,
faPenToSquare,
faPercent,
faStar,
faTags,
faTruckFast,
faUserCircle
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import type {
ProfileEditTab,
ProfileSectionStatus,
} from "../profile-page.types";

export const PROFILE_EDIT_TAB_COLORS: Record<ProfileEditTab, string> = {
  registration: "#7C3AED",
  specialties: "#D97706",
  products: "#16A34A",
  contact: "#2563EB",
  store: "#4F46E5",
  workingHours: "#EA580C",
  fulfillment: "#0891B2",
  discounts: "#DB2777",
};

export const PROFILE_EDIT_TAB_ICONS: Record<ProfileEditTab, IconDefinition> = {
  registration: faUserCircle,
  specialties: faStar,
  products: faTags,
  contact: faComments,
  store: faBuilding,
  workingHours: faClock,
  fulfillment: faTruckFast,
  discounts: faPercent,
};

export function ProfileEditSectionFrame({
  children,
  icon,
  title,
  status,
  locale,
  color,
  hideHeader = false,
}: {
  children: React.ReactNode;
  icon: IconDefinition;
  title: string;
  status: ProfileSectionStatus | null | undefined;
  locale: string;
  color: string;
  hideHeader?: boolean;
}) {
  const isDirty = Boolean(status?.isDirty);
  const isSaving = Boolean(status?.isSaving);
  const canSave = status?.canSave !== false;
  const statusText = isSaving
    ? locale === "ar"
      ? "جاري الحفظ"
      : "Saving"
    : isDirty
      ? canSave
        ? locale === "ar"
          ? "غير محفوظ"
          : "Unsaved"
        : locale === "ar"
          ? "يحتاج مراجعة"
          : "Needs review"
      : locale === "ar"
        ? "مستقر"
        : "Stable";

  return (
    <section
      className="rounded-3xl border bg-surface/90 p-3 shadow-lg shadow-primary/5 sm:p-4"
      style={{ borderColor: `${color}44` }}
    >
      {!hideHeader ? (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-3 py-3"
          style={{ backgroundColor: `${color}10` }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${color}18`, color }}
            >
              <FontAwesomeIcon icon={icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-on-surface">
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {locale === "ar"
                  ? "تابع تعديلات هذا القسم واحفظها من شريط الحفظ."
                  : "Review this section and save it from the save bar."}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
              isSaving
                ? "bg-primary/10 text-primary"
                : isDirty
                  ? canSave
                    ? "bg-error/10 text-error"
                    : "bg-error-container text-on-error-container"
                  : "bg-primary/10 text-primary"
            }`}
          >
            <FontAwesomeIcon
              icon={isDirty ? faPenToSquare : faCircleCheck}
              className="h-3.5 w-3.5"
            />
            {statusText}
          </span>
        </div>
      ) : null}
      <div className="[&_.auth-input]:shadow-sm [&_button]:transition-all">
        {children}
      </div>
    </section>
  );
}
