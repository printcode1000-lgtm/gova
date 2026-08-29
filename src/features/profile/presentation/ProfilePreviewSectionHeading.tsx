"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { uiAttributes } from "@asol/ui-registry-core";

export function ProfilePreviewSectionHeading({ id,
  icon,
  title,
  hint,
}: {
  icon: IconDefinition;
  title: string;
  hint: string;
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "profile.profile-preview-section-heading.div-WT5U7c", id: "profile.profile-preview-section-heading.div" })} id={id} className="mb-5 flex min-w-0 items-center gap-3">
      <span {...uiAttributes({ uid: "profile.profile-preview-section-heading.span-0CZk6d", id: "profile.profile-preview-section-heading.span" })} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg text-primary sm:h-12 sm:w-12 sm:text-xl">
        <FontAwesomeIcon icon={icon} />
      </span>
      <div {...uiAttributes({ uid: "profile.profile-preview-section-heading.div.2-G0Ez52", id: "profile.profile-preview-section-heading.div.2" })} className="min-w-0 flex-1">
        <h2 {...uiAttributes({ uid: "profile.profile-preview-section-heading.h2-6xH2QD", id: "profile.profile-preview-section-heading.h2" })} className="break-words text-lg font-bold sm:text-xl">{title}</h2>
        <p {...uiAttributes({ uid: "profile.profile-preview-section-heading.p-qmG1Un", id: "profile.profile-preview-section-heading.p" })} className="break-words text-xs text-on-surface-variant">{hint}</p>
      </div>
    </div>
  );
}
