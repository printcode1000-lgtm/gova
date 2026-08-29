"use client";

import type { LucideIcon } from "lucide-react";
import { uiAttributes } from "@asol/ui-registry-core";

export function ContactSectionHeader({ id,
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "profile.contact-info.contact-section-header.div-V2zABn", id: "profile.contact-info.contact-section-header.div" })} id={id}>
      <h2 {...uiAttributes({ uid: "profile.contact-info.contact-section-header.h2-7OWKpP", id: "profile.contact-info.contact-section-header.h2" })} className="flex items-center gap-2 text-base font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h2>
      <p {...uiAttributes({ uid: "profile.contact-info.contact-section-header.p-R6mRY5", id: "profile.contact-info.contact-section-header.p" })} className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
