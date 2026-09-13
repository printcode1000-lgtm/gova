"use client";

import {
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
  const [centerIndex, setCenterIndex] = useState(() =>
    Math.max(0, visibleSections.indexOf(model.activeTab)),
  );
  const pointerStartX = useRef<number | null>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    const activeIndex = visibleSections.indexOf(model.activeTab);
    setCenterIndex(activeIndex >= 0 ? activeIndex : 0);
  }, [model.activeTab, model.providerAccountEnabled]);

  useEffect(() => {
    const centeredSection = visibleSections[centerIndex];
    if (!centeredSection || centeredSection === model.activeTab) return;

    const settleTimer = window.setTimeout(() => {
      model.selectSection(centeredSection);
    }, 500);

    return () => window.clearTimeout(settleTimer);
  }, [centerIndex, model.activeTab, model.providerAccountEnabled, model.selectSection]);

  const moveCenter = (direction: -1 | 1) => {
    setCenterIndex((current) =>
      (current + direction + visibleSections.length) % visibleSections.length,
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartX.current = event.clientX;
    draggedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) return;
    if (Math.abs(event.clientX - pointerStartX.current) > 8) {
      draggedRef.current = true;
    }
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) return;
    const deltaX = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (Math.abs(deltaX) >= 34) moveCenter(deltaX < 0 ? 1 : -1);
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      id={id}
      className="order-2 w-full max-w-full overflow-hidden rounded-[1.4rem] border border-outline-variant/40 bg-surface-container-low/80 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.55)] backdrop-blur-xl"
    >
      <div
        id="profile-presentation-profile-page-profileeditworkspacechrome-div-2-9oleon"
        ref={model.tabsScrollRef}
        data-snapshot-id="profile-edit-tabs-scroll"
        role="group"
        tabIndex={0}
        aria-label={model.t("profile.subtitle")}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={(event) => {
          pointerStartX.current = null;
          draggedRef.current = false;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveCenter(model.locale === "ar" ? 1 : -1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            moveCenter(model.locale === "ar" ? -1 : 1);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            model.selectSection(visibleSections[centerIndex]);
          }
        }}
        className="relative h-[92px] w-full touch-pan-y overflow-hidden outline-none"
        style={{
          perspective: "820px",
          perspectiveOrigin: "50% 50%",
          background:
            "radial-gradient(circle at 50% 100%, color-mix(in srgb, var(--primary) 14%, transparent) 0%, transparent 58%)",
        }}
      >
        <div
          id="profile-presentation-profile-page-profileeditworkspacechrome-floor-glow-7m3k2p"
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-1/2 h-3 w-[38%] -translate-x-1/2 rounded-[999px] bg-foreground/10 blur-xl"
        />
        {visibleSections.map((section, index) => {
          const color = PROFILE_EDIT_TAB_COLORS[section];
          const selected = model.activeTab === section;
          let offset = index - centerIndex;
          const half = visibleSections.length / 2;
          if (offset > half) offset -= visibleSections.length;
          if (offset < -half) offset += visibleSections.length;
          const distance = Math.abs(offset);
          const centered = offset === 0;
          const direction = Math.sign(offset);
          const horizontalSlots = [0, 68, 122, 164, 194];
          const translateX = direction * (horizontalSlots[distance] ?? 194);
          const translateY = distance * 1.5;
          const translateZ = centered ? 52 : -42 - distance * 38;
          const rotateY = direction * -Math.min(54, 26 + distance * 7);
          const scale = centered ? 1.04 : Math.max(0.52, 0.8 - (distance - 1) * 0.09);

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
              className="absolute left-1/2 top-1/2 flex h-[64px] w-[76px] flex-col items-center justify-center gap-0.5 rounded-[0.95rem] border px-1 text-center shadow-lg outline-none will-change-transform focus-visible:ring-2 focus-visible:ring-primary/60"
              style={{
                transform: `translate(-50%, -50%) translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                transformStyle: "preserve-3d",
                transformOrigin: "center center",
                transition:
                  "transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease, filter 260ms ease, box-shadow 260ms ease",
                zIndex: 60 - distance,
                opacity: centered ? 1 : Math.max(0.5, 0.9 - distance * 0.09),
                filter: centered
                  ? `drop-shadow(0 10px 18px ${color}22)`
                  : `brightness(${Math.max(0.74, 0.94 - distance * 0.05)}) saturate(0.88)`,
                background: centered
                  ? `linear-gradient(145deg, ${color}2F, ${color}12 55%, color-mix(in srgb, var(--background) 92%, transparent))`
                  : `linear-gradient(145deg, ${color}18, color-mix(in srgb, var(--background) 94%, transparent))`,
                borderColor: centered ? `${color}B8` : `${color}55`,
                boxShadow: centered
                  ? `0 18px 32px -18px ${color}88, inset 0 1px 0 rgba(255,255,255,.2)`
                  : "0 10px 24px -20px rgba(15,23,42,.65)",
              }}
            >
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
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
                  style={{
                    color,
                    width: centered ? "1.65rem" : "1.4rem",
                    height: centered ? "1.65rem" : "1.4rem",
                    fontSize: centered ? "1.65rem" : "1.4rem",
                    filter: centered ? `drop-shadow(0 0 0.45rem ${color}66)` : undefined,
                  }}
                />
              </span>
              <span
                className="line-clamp-2 block w-full text-center font-bold tracking-tight"
                style={{
                  color: centered ? color : undefined,
                  fontSize: centered ? "0.54rem" : "0.47rem",
                  lineHeight: centered ? "0.62rem" : "0.55rem",
                }}
              >
                {labels[section]}
              </span>
              {model.sectionStatuses[section]?.isDirty ? (
                <span className="absolute end-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-error ring-2 ring-surface" />
              ) : null}
              {selected ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1.5 h-1 w-5 rounded-full"
                  style={{ backgroundColor: color }}
                />
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
