"use client";

import type { LucideIcon } from "lucide-react";

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
    <div id={id}>
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h2>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
