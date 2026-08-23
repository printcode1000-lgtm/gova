"use client";

import * as React from "react";

import { useSession } from "@/features/auth/ui";
import {
  isSpecialtyChatSessionTokenFailure,
  specialtyChatClient,
} from "@/features/specialty-chat";
import { useTranslation } from "@/shared/i18n";

import type { ShowSettingsStatus } from "./use-settings-status-banner";

/**
 * The account's chat intake preferences — who may start a conversation.
 *
 * Account-scoped, unlike the per-device push switch: these follow the user to
 * every device they sign in on.
 */
export function useChatMessagePreferences(showStatus: ShowSettingsStatus) {
  const { t } = useTranslation();
  const { session } = useSession();
  const [specialtyRequestsEnabled, setSpecialtyRequestsEnabled] =
    React.useState(true);
  const [productConversationsEnabled, setProductConversationsEnabled] =
    React.useState(true);
  const [specialtyPreferenceBusy, setSpecialtyPreferenceBusy] =
    React.useState(false);
  const [productConversationsBusy, setProductConversationsBusy] =
    React.useState(false);

  const preferencesAvailable = Boolean(session?.sessionToken);

  React.useEffect(() => {
    if (!session?.sessionToken) return;
    void specialtyChatClient
      .preferences(session)
      .then((preferences) => {
        setSpecialtyRequestsEnabled(preferences.specialtyRequestsEnabled);
        setProductConversationsEnabled(preferences.productConversationsEnabled);
      })
      .catch((error) => {
        if (isSpecialtyChatSessionTokenFailure(error)) return;
        console.warn(
          "[NotificationDeviceSettingsCard] Failed to load chat preferences.",
          error,
        );
      });
  }, [session]);

  const updateSpecialtyRequests = React.useCallback(
    async (enabled: boolean) => {
      if (!session?.sessionToken || specialtyPreferenceBusy) return;
      setSpecialtyPreferenceBusy(true);
      try {
        const value = await specialtyChatClient.preferences(session, {
          specialtyRequestsEnabled: enabled,
        });
        setSpecialtyRequestsEnabled(value.specialtyRequestsEnabled);
        showStatus(
          value.specialtyRequestsEnabled
            ? t("notifications.deviceCard.specialtyRequestsOn")
            : t("notifications.deviceCard.specialtyRequestsOff"),
        );
      } catch (error) {
        showStatus(
          error instanceof Error
            ? error.message
            : t("notifications.deviceCard.specialtyRequestsError"),
          "error",
        );
      } finally {
        setSpecialtyPreferenceBusy(false);
      }
    },
    [session, showStatus, specialtyPreferenceBusy, t],
  );

  const updateProductConversations = React.useCallback(
    async (enabled: boolean) => {
      if (!session?.sessionToken || productConversationsBusy) return;
      setProductConversationsBusy(true);
      try {
        const value = await specialtyChatClient.preferences(session, {
          productConversationsEnabled: enabled,
        });
        setProductConversationsEnabled(value.productConversationsEnabled);
        showStatus(
          value.productConversationsEnabled
            ? t("notifications.deviceCard.productConversationsOn")
            : t("notifications.deviceCard.productConversationsOff"),
        );
      } catch (error) {
        showStatus(
          error instanceof Error
            ? error.message
            : t("notifications.deviceCard.productConversationsError"),
          "error",
        );
      } finally {
        setProductConversationsBusy(false);
      }
    },
    [productConversationsBusy, session, showStatus, t],
  );

  return {
    preferencesAvailable,
    productConversationsBusy,
    productConversationsEnabled,
    specialtyPreferenceBusy,
    specialtyRequestsEnabled,
    updateProductConversations,
    updateSpecialtyRequests,
  };
}
