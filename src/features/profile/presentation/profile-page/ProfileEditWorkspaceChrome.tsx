"use client";

import { Button } from "@/components/ui/button";
import {
  faCircleCheck,
  faFloppyDisk,
  faListCheck,
  faPenToSquare,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { ProfileEditTab } from "../profile-page.types";
import { PROFILE_SECTION_IDS, PROFILE_SECTIONS } from "../profile-page.types";
import type { ProfilePageContentModel } from "./ProfilePageContent.model";
import {
  PROFILE_EDIT_TAB_COLORS,
  PROFILE_EDIT_TAB_ICONS,
} from "./ProfilePageContent.profile-tabs";

function profileEditTabLabels(
  t: ProfilePageContentModel["t"],
  locale: ProfilePageContentModel["locale"],
): Record<ProfileEditTab, string> {
  return {
    registration: t("onboarding.contactInfo.primaryContact"),
    specialties: t("onboarding.storeIdentity.specialties"),
    products: t("onboarding.storeIdentity.products"),
    contact: t("onboarding.contactInfo.additionalContact"),
    store: t("onboarding.storeIdentity.title"),
    workingHours: locale === "ar" ? "مواعيد العمل" : "Working hours",
    fulfillment: locale === "ar" ? "الشحن والإرجاع" : "Shipping",
    discounts: locale === "ar" ? "العروض" : "Offers",
  };
}

export function ProfileEditTabsBar({
  model,
}: {
  model: ProfilePageContentModel;
}) {
  const labels = profileEditTabLabels(model.t, model.locale);

  return (
    <div className="order-2 w-full max-w-full overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-low/85 shadow-sm backdrop-blur-xl">
      <div
        data-snapshot-scroll
        data-snapshot-id="profile-edit-tabs-scroll"
        className="flex snap-x snap-mandatory items-stretch gap-1.5 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={model.t("profile.subtitle")}
      >
        {PROFILE_SECTIONS.map((section) => {
          const color = PROFILE_EDIT_TAB_COLORS[section];
          const active = model.activeTab === section;

          return (
            <button
              key={section}
              ref={(node) => {
                model.navButtonRefs.current[section] = node;
              }}
              type="button"
              onClick={() => model.selectSection(section)}
              aria-pressed={active}
              aria-controls={PROFILE_SECTION_IDS[section]}
              className="group relative flex h-16 w-16 shrink-0 snap-center flex-col items-center justify-center gap-0 rounded-xl border text-center shadow-sm transition-all duration-200 active:scale-95"
              style={{
                paddingInline: "0.0625rem",
                paddingBlock: "0.0625rem",
                background: active
                  ? `linear-gradient(135deg, ${color}26, ${color}10)`
                  : `linear-gradient(135deg, ${color}14, ${color}06)`,
                borderColor: active ? `${color}AA` : `${color}55`,
              }}
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                {active ? (
                  <>
                    <span
                      className="asol-profile-tab-wave pointer-events-none absolute inset-0 rounded-full"
                      style={{
                        color: `${color}80`,
                        borderColor: `${color}B8`,
                        backgroundColor: `${color}20`,
                      }}
                    />
                    <span
                      className="asol-profile-tab-wave asol-profile-tab-wave--delayed pointer-events-none absolute inset-0 rounded-full"
                      style={{
                        color: `${color}66`,
                        borderColor: `${color}9E`,
                        backgroundColor: `${color}18`,
                      }}
                    />
                  </>
                ) : null}
                <FontAwesomeIcon
                  icon={PROFILE_EDIT_TAB_ICONS[section]}
                  className="relative z-10 shrink-0 transition-transform duration-300"
                  style={{
                    color,
                    width: "2rem",
                    height: "2rem",
                    fontSize: "2rem",
                    filter: active
                      ? `drop-shadow(0 0 0.35rem ${color}55)`
                      : undefined,
                  }}
                />
              </span>
              <span
                className="line-clamp-2 block w-full text-center font-semibold tracking-tight text-muted-foreground"
                style={{
                  fontSize: "0.5rem",
                  lineHeight: "0.6rem",
                }}
              >
                {labels[section]}
              </span>
              {model.sectionStatuses[section]?.isDirty ? (
                <span className="absolute end-1 top-1 h-2.5 w-2.5 rounded-full bg-error ring-2 ring-surface" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProfileEditSaveBanner({
  model,
}: {
  model: ProfilePageContentModel;
}) {
  if (model.dirtySections.length === 0) return null;

  return (
    <div className="order-1 w-full max-w-full overflow-hidden rounded-3xl border border-primary/20 bg-surface/90 p-3 shadow-lg shadow-primary/5 backdrop-blur-xl sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              model.dirtyLabels.length > 0
                ? "bg-error/10 text-error"
                : "bg-primary/10 text-primary"
            }`}
          >
            <FontAwesomeIcon
              icon={
                model.isUnifiedSaving
                  ? faFloppyDisk
                  : model.dirtyLabels.length > 0
                    ? faPenToSquare
                    : faCircleCheck
              }
              className="h-5 w-5"
            />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-on-surface">
              <FontAwesomeIcon icon={faListCheck} className="h-4 w-4 text-primary" />
              {model.locale === "ar" ? "حفظ تعديلات الملف" : "Save profile changes"}
              <span className="rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
                {model.dirtySections.length}{""}
                {model.locale === "ar"
                  ? "قسم معدل"
                  : model.dirtySections.length === 1
                    ? "changed section"
                    : "changed sections"}
              </span>
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-on-surface-variant">
              {model.isUnifiedSaving
                ? model.t("profile.saving")
                : model.dirtyLabels.length > 0
                  ? `${model.t("profile.saveTargets")}: ${model.dirtyLabels.join("، ")}`
                  : model.locale === "ar"
                    ? "لا توجد تغييرات غير محفوظة في التبويب الحالي أو باقي التبويبات."
                    : "There are no unsaved changes in the current tab or other tabs."}
            </p>
            {model.saveError ? (
              <p className="mt-2 inline-flex items-center gap-2 rounded-xl bg-error/10 px-3 py-1.5 text-xs font-semibold text-error">
                <FontAwesomeIcon icon={faTriangleExclamation} className="h-4 w-4" />
                {model.saveError}
              </p>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          className="h-11 shrink-0 gap-2 rounded-2xl px-5 font-bold shadow-md shadow-primary/15"
          onClick={() => void model.saveProfileChanges()}
          disabled={
            model.isUnifiedSaving ||
            model.isSaveBlocked ||
            model.dirtySections.length === 0
          }
        >
          {model.isUnifiedSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
          )}
          {model.isUnifiedSaving ? model.t("profile.saving") : model.t("profile.save")}
        </Button>
      </div>
    </div>
  );
}

export function ProfileEditCarouselControls({
  model,
}: {
  model: ProfilePageContentModel;
}) {
  return (
    <div
      className="flex items-center justify-center gap-4 border-t border-outline-variant/50 py-3"
      aria-hidden="true"
    >
      <button
        type="button"
        onClick={() => model.goToAdjacentSection(-1)}
        disabled={model.activeSectionIndex === 0}
        aria-label={model.locale === "ar" ? "القسم السابق" : "Previous section"}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface/95 text-on-surface shadow-md transition disabled:pointer-events-none disabled:opacity-25"
      >
        {model.locale === "ar" ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
      <div className="flex justify-center gap-2">
        {PROFILE_SECTIONS.map((section) => (
          <span
            key={section}
            className={`h-2 rounded-full transition-all ${model.activeTab === section ? "w-6 bg-primary" : "w-2 bg-outline-variant"}`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => model.goToAdjacentSection(1)}
        disabled={model.activeSectionIndex === PROFILE_SECTIONS.length - 1}
        aria-label={model.locale === "ar" ? "القسم التالي" : "Next section"}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface/95 text-on-surface shadow-md transition disabled:pointer-events-none disabled:opacity-25"
      >
        {model.locale === "ar" ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
