"use client";

import { Bell } from "lucide-react";
import { uiAttributes } from "@asol/ui-registry-core";

export function NotificationsEmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section {...uiAttributes({ uid: "notifications-empty-VZ652S", id: "notifications-empty", kind: "region", simulation: { kind: "state", id: "notifications-empty" } })} className="rounded-2xl border border-dashed border-outline-variant p-10 text-center">
      <Bell className="mx-auto h-10 w-10 text-on-surface-variant" />
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-on-surface-variant">{text}</p>
    </section>
  );
}
