"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function ProfilePreviewSectionHeading({
  icon,
  title,
  hint,
}: {
  icon: IconDefinition;
  title: string;
  hint: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary">
        <FontAwesomeIcon icon={icon} />
      </span>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-xs text-on-surface-variant">{hint}</p>
      </div>
    </div>
  );
}
