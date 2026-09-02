"use client";

import { Bell } from "lucide-react";

export function NotificationsEmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section id="features-notifications-presentation-notificationsemptystate-section-1-g5a9hx" className="rounded-2xl border border-dashed border-outline-variant p-10 text-center">
      <Bell id='features-notifications-presentation-notificationsemptystate-bell-2-cozcfx' className="mx-auto h-10 w-10 text-on-surface-variant" />
      <h2 id='features-notifications-presentation-notificationsemptystate-heading-3-fgzlj3' className="mt-4 text-lg font-bold">{title}</h2>
      <p id='features-notifications-presentation-notificationsemptystate-text-4-bp67cv' className="mt-2 text-sm text-on-surface-variant">{text}</p>
    </section>
  );
}
