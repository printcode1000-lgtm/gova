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
    <div id={id} className="mb-5 flex min-w-0 items-center gap-3">
      <span id={id ? `${id}-text-2-rnwqhh` : undefined} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg text-primary sm:h-12 sm:w-12 sm:text-xl">
        <FontAwesomeIcon icon={icon} />
      </span>
      <div id={id ? `${id}-div-3-9qngew` : undefined} className="min-w-0 flex-1">
        <h2 id={id ? `${id}-heading-4-ifzlld` : undefined} className="break-words text-lg font-bold sm:text-xl">{title}</h2>
        <p id={id ? `${id}-text-5-lnwjkl` : undefined} className="break-words text-xs text-on-surface-variant">{hint}</p>
      </div>
    </div>
  );
}
