"use client";

import {
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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

export function ProfileEditTabsBar({ id,
  model,
}: {
  model: ProfilePageContentModel;
} & { id?: string }) {
  const labels = profileEditTabLabels(model.t, model.locale);

  return (
    <div id={id} className="order-2 w-full max-w-full overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-low/85 shadow-sm backdrop-blur-xl">
      <div
        ref={model.tabsScrollRef}
        data-snapshot-id="profile-edit-tabs-scroll"
        className="flex snap-x snap-mandatory scroll-smooth items-stretch gap-1.5 overflow-x-auto overscroll-x-contain px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={model.t("profile.subtitle")}
      >
        {PROFILE_SECTIONS.map((section) => {
          const color = PROFILE_EDIT_TAB_COLORS[section];
          const active = model.activeTab === section;

          return (
            <button id={id ? `${id}.${section}` : undefined}
              key={section}
              ref={(node) => {
                model.navButtonRefs.current[section] = node;
              }}
              type="button"
              onClick={() => model.selectSection(section)}
              aria-pressed={active}
              aria-current={active ? "true" : undefined}
              aria-controls={PROFILE_SECTION_IDS[section]}
              className="group relative flex h-16 w-16 shrink-0 snap-center snap-always flex-col items-center justify-center gap-0 rounded-xl border text-center shadow-sm transition-all duration-200 active:scale-95"
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

export function ProfileEditSaveFeedback({ id,
  model,
}: {
  model: ProfilePageContentModel;
} & { id?: string }) {
  if (!model.saveError) return null;

  return (
    <div id={id} className="order-1 w-full max-w-full overflow-hidden rounded-3xl border border-error/20 bg-error/5 p-3 shadow-lg shadow-error/5 backdrop-blur-xl sm:p-4">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-error">
        <FontAwesomeIcon icon={faTriangleExclamation} className="h-4 w-4" />
        {model.saveError}
      </p>
    </div>
  );
}
