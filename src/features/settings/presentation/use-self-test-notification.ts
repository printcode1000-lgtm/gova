"use client";

import * as React from "react";

import { isSuperAdmin } from "@/features/auth";
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
 *
 * Three outcomes, because they need three different actions: no registered
 * device (turn the switch on), the grant never left this client (the delivery
 * channel itself is unreachable), and a real provider failure.
 */
export function useSelfTestNotification(showStatus: ShowSettingsStatus) {
  const { t, locale } = useTranslation();
  const { session } = useSession();
  const [selfTestBusy, setSelfTestBusy] = React.useState(false);

  /**
   * Super admin only. The route stays open to any signed-in account by design,
   * but the control is a diagnostic tool rather than an account setting, so it
   * is not painted for the people it would only confuse.
   */
  const selfTestAvailable = Boolean(session?.sessionToken) && isSuperAdmin(session);

  const sendSelfTest = React.useCallback(async () => {
    if (!session?.sessionToken || !isSuperAdmin(session) || selfTestBusy) return;
    setSelfTestBusy(true);
    try {
      const result = await notifications.sendSelfTest({
        sessionToken: session.sessionToken,
        locale: locale === "en" ? "en" : "ar",
      });
      const outcome = result.results[0];
      // `granted` is the main app's own placeholder: it survives only when the
      // bridge never carried the grant anywhere, which is a different failure
      // from a device that refused the push and needs a different answer.
      if (!outcome || outcome.status === "granted") {
        showStatus(t("notifications.selfTest.notDelivered"), "error");
        return;
      }
      if (outcome.tokenCount === 0) {
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
