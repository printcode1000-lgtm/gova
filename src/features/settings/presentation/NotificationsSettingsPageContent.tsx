"use client";

import { useTranslation } from "@/lib/i18n";
import { NotificationDeviceSettingsCard } from "./NotificationDeviceSettingsCard";

export function NotificationsSettingsPageContent() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-32 sm:px-6 sm:py-12 md:px-12">
      <header className="mb-8 space-y-2 text-center sm:mb-12">
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">
          {t("sidebar.browserNotifications")}
        </h1>
      </header>
      <NotificationDeviceSettingsCard />
    </div>
  );
}
