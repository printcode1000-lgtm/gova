"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { LoginRequiredDialog } from "@/features/auth/ui";
import { useSession } from "@/features/auth/ui";
import { useTranslation } from "@/shared/i18n";

import { NotificationDeviceSettingsCard } from "./NotificationDeviceSettingsCard";

export function NotificationsSettingsPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isLoggedIn, isLoading } = useSession();

  const leavePage = React.useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace("/home");
  }, [router]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-32 sm:px-6 sm:py-12 md:px-12">
        <p className="text-center text-sm text-on-surface-variant">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <LoginRequiredDialog
        open
        title={t("settings.notifications.loginRequired.title")}
        description={t("settings.notifications.loginRequired.description")}
        signInLabel={t("settings.notifications.loginRequired.signIn")}
        cancelLabel={t("settings.notifications.loginRequired.cancel")}
        onCancel={leavePage}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-32 sm:px-6 sm:py-12 md:px-12">
      <header className="mb-8 space-y-2 text-center sm:mb-12">
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">
          {t("settings.notifications.title")}
        </h1>
      </header>
      <NotificationDeviceSettingsCard />
    </div>
  );
}
