"use client";

import * as React from "react";

import { useSession } from "@/features/auth/ui";
import { notifications } from "@/features/notifications";
import { useTranslation } from "@/shared/i18n";

import type { ShowSettingsStatus } from "./use-settings-status-banner";

/**
 * The account's own delivery test.
 *
 * The outcome is reported by what actually happened, not by "the request
 * succeeded": a send with no registered token completes cleanly and delivers
 * nothing, which is exactly the case a user presses this button to discover.
 */
export function useSelfTestNotification(showStatus: ShowSettingsStatus) {
  const { t, locale } = useTranslation();
  const { session } = useSession();
  const [selfTestBusy, setSelfTestBusy] = React.useState(false);

  const selfTestAvailable = Boolean(session?.sessionToken);

  const sendSelfTest = React.useCallback(async () => {
    if (!session?.sessionToken || selfTestBusy) return;
    setSelfTestBusy(true);
    try {
      const result = await notifications.sendSelfTest({
        sessionToken: session.sessionToken,
        locale: locale === "en" ? "en" : "ar",
      });
      const outcome = result.results[0];
      if (!outcome || outcome.tokenCount === 0) {
        showStatus(t("notifications.selfTest.noDevices"), "error");
        return;
      }
      if (outcome.status === "failed" || outcome.status === "muted") {
        showStatus(t("notifications.selfTest.failed"), "error");
        return;
      }
      showStatus(t("notifications.selfTest.sent"));
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : t("notifications.selfTest.failed"),
        "error",
      );
    } finally {
      setSelfTestBusy(false);
    }
  }, [locale, selfTestBusy, session, showStatus, t]);

  return { selfTestAvailable, selfTestBusy, sendSelfTest };
}
