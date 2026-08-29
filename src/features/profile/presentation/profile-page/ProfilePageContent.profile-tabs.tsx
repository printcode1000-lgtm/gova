"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
faBuilding,
faClock,
faComments,
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
import { uiAttributes } from "@asol/ui-registry-core";

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

export function ProfileEditSectionFrame({ id,
  children,
  icon,
  title,
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
} & { id?: string }) {
  return (
    <section {...uiAttributes({ uid: "profile.profile-page.profile-page-content.profile-tabs.section-BKbmM2", id: "profile.profile-page.profile-page-content.profile-tabs.section" })} id={id}
      className="rounded-3xl border bg-surface/90 p-3 shadow-lg shadow-primary/5 sm:p-4"
      style={{ borderColor: `${color}44` }}
    >
      {!hideHeader ? (
        <div {...uiAttributes({ uid: "profile.profile-page.profile-page-content.profile-tabs.div-8Hn1SJ", id: "profile.profile-page.profile-page-content.profile-tabs.div" })}
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-3 py-3"
          style={{ backgroundColor: `${color}10` }}
        >
          <div {...uiAttributes({ uid: "profile.profile-page.profile-page-content.profile-tabs.div.2-AMNMp3", id: "profile.profile-page.profile-page-content.profile-tabs.div.2" })} className="flex min-w-0 items-center gap-3">
            <span {...uiAttributes({ uid: "profile.profile-page.profile-page-content.profile-tabs.span-Ei4H3P", id: "profile.profile-page.profile-page-content.profile-tabs.span" })}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${color}18`, color }}
            >
              <FontAwesomeIcon icon={icon} className="h-5 w-5" />
            </span>
            <div {...uiAttributes({ uid: "profile.profile-page.profile-page-content.profile-tabs.div.3-OuRam7", id: "profile.profile-page.profile-page-content.profile-tabs.div.3" })} className="min-w-0">
              <h2 {...uiAttributes({ uid: "profile.profile-page.profile-page-content.profile-tabs.h2-6lFFtf", id: "profile.profile-page.profile-page-content.profile-tabs.h2" })} className="truncate text-base font-bold text-on-surface">
                {title}
              </h2>
            </div>
          </div>
        </div>
      ) : null}
      <div {...uiAttributes({ uid: "profile.profile-page.profile-page-content.profile-tabs.div.4-D935uF", id: "profile.profile-page.profile-page-content.profile-tabs.div.4" })} className="[&_.auth-input]:shadow-sm [&_button]:transition-all">
        {children}
      </div>
    </section>
  );
}
