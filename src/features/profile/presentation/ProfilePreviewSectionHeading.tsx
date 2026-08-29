"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

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
    <div id={id} className="mb-5 flex items-center gap-3">
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg text-primary sm:h-12 sm:w-12 sm:text-xl">
        <FontAwesomeIcon icon={icon} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="break-words text-lg font-bold sm:text-xl">{title}</h2>
        <p className="break-words text-xs text-on-surface-variant">{hint}</p>
      </div>
    </div>
  );
}
