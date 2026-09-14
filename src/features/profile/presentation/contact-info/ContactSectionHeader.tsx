"use client";

import type { LucideIcon } from "lucide-react";

export function ContactSectionHeader({ id,
  icon: Icon,
  title,
  description,
  badgeCount,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  badgeCount?: number;
} & { id?: string }) {
  return (
    <div id={id}>
      <h2 id="profile-presentation-contact-info-contactsectionheader-heading-2-5icmhi" className="flex items-center gap-2 text-base font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
        {badgeCount && badgeCount > 0 ? (
          <span id="profile-presentation-contact-info-contactinfocard-contact-types-text-5-0w3lfb" className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold leading-none text-primary">
            {badgeCount}
          </span>
        ) : null}
      </h2>
      <p id="profile-presentation-contact-info-contactsectionheader-text-3-dpqkop" className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
