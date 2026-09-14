"use client";

import {
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  SPATIAL_CAROUSEL_FLOOR_GLOW_CLASSNAME,
  SPATIAL_CAROUSEL_ICON_WRAP_CLASSNAME,
  SPATIAL_CAROUSEL_ITEM_CLASSNAME,
  SPATIAL_CAROUSEL_LABEL_CLASSNAME,
  SPATIAL_CAROUSEL_SHELL_CLASSNAME,
  SPATIAL_CAROUSEL_VIEWPORT_CLASSNAME,
  SPATIAL_CAROUSEL_VIEWPORT_STYLE,
  getSpatialCarouselIconStyle,
  getSpatialCarouselIconWrapStyle,
  getSpatialCarouselItemPresentation,
  getSpatialCarouselLabelStyle,
  shouldShowSpatialCarouselLabel,
  useSpatialCarousel,
} from "@asol/spatial-carousel-core";
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
    store: locale === "ar" ? "البروفايل" : t("profile.storeIdentity.activityTitle"),
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
  const visibleSections: ProfileEditTab[] = model.providerAccountEnabled
    ? PROFILE_SECTIONS
    : ["registration", "contact"];
  const selectedIndex = Math.max(0, visibleSections.indexOf(model.activeTab));
  const {
    centerIndex,
    setCenterIndex,
    moveCenter,
    draggedRef,
    pointerHandlers,
  } = useSpatialCarousel({
    itemCount: visibleSections.length,
    selectedIndex,
    onSettledIndex: (index) => {
      const centeredSection = visibleSections[index];
      if (centeredSection && centeredSection !== model.activeTab) {
        model.selectSection(centeredSection);
      }
    },
  });

  return (
    <div
      id={id}
      className={`order-2 ${SPATIAL_CAROUSEL_SHELL_CLASSNAME}`}
    >
      <div
        id="profile-presentation-profile-page-profileeditworkspacechrome-div-2-9oleon"
        ref={model.tabsScrollRef}
        data-snapshot-id="profile-edit-tabs-scroll"
        role="group"
        tabIndex={0}
        aria-label={model.t("profile.subtitle")}
        {...pointerHandlers}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveCenter(model.locale === "ar" ? 1 : -1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            moveCenter(model.locale === "ar" ? -1 : 1);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            const centeredSection = visibleSections[centerIndex];
            if (centeredSection) model.selectSection(centeredSection);
          }
        }}
        className={SPATIAL_CAROUSEL_VIEWPORT_CLASSNAME}
        style={SPATIAL_CAROUSEL_VIEWPORT_STYLE}
      >
        <div
          id="profile-presentation-profile-page-profileeditworkspacechrome-floor-glow-7m3k2p"
          aria-hidden="true"
          className={SPATIAL_CAROUSEL_FLOOR_GLOW_CLASSNAME}
        />
        {visibleSections.map((section, index) => {
          const color = PROFILE_EDIT_TAB_COLORS[section];
          const selected = model.activeTab === section;
          const presentation = getSpatialCarouselItemPresentation(
            index,
            centerIndex,
            visibleSections.length,
            color,
          );
          const { centered } = presentation;

          return (
            <button
              id={id ? `${id}.${section}` : undefined}
              key={section}
              ref={(node) => {
                model.navButtonRefs.current[section] = node;
              }}
              type="button"
              onClick={(event) => {
                if (draggedRef.current) {
                  event.preventDefault();
                  return;
                }
                if (!centered) {
                  setCenterIndex(index);
                  return;
                }
                model.selectSection(section);
              }}
              aria-pressed={selected}
              aria-current={selected ? "true" : undefined}
              aria-controls={PROFILE_SECTION_IDS[section]}
              aria-label={`${labels[section]}${centered ? "" : "، انقل إلى المنتصف"}`}
              className={SPATIAL_CAROUSEL_ITEM_CLASSNAME}
              style={presentation.style}
            >
              <span className={SPATIAL_CAROUSEL_ICON_WRAP_CLASSNAME} style={getSpatialCarouselIconWrapStyle(centered)}>
                {centered ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full blur-md"
                    style={{ backgroundColor: `${color}2A` }}
                  />
                ) : null}
                <FontAwesomeIcon
                  icon={PROFILE_EDIT_TAB_ICONS[section]}
                  className="relative z-10 shrink-0 transition-transform duration-300"
                  style={getSpatialCarouselIconStyle(color, centered)}
                />
              </span>
              {shouldShowSpatialCarouselLabel(centered) ? (
                <span
                  className={SPATIAL_CAROUSEL_LABEL_CLASSNAME}
                  style={getSpatialCarouselLabelStyle(color, centered)}
                >
                  {labels[section]}
                </span>
              ) : null}
              {model.sectionStatuses[section]?.isDirty ? (
                <span className="absolute end-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-error ring-2 ring-surface" />
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
      <p id="profile-presentation-profile-page-profileeditworkspacechrome-text-4-cwzzju" className="inline-flex items-center gap-2 text-sm font-semibold text-error">
        <FontAwesomeIcon icon={faTriangleExclamation} className="h-4 w-4" />
        {model.saveError}
      </p>
    </div>
  );
}
