"use client";

import { useEffect } from "react";
import { useSession } from "@/features/auth/ui";
import { notifications } from "@/features/notifications";
import { createSpecialtyChatNotificationExtension } from "../application/specialty-chat-notification-extension";

/**
 * Attaches specialty chat to the notification centre.
 *
 * Mounted once in the application shell, below `SessionProvider`. Registration
 * is explicit rather than an import side effect so the wiring is visible in the
 * layout, and it is redone whenever the signed-in user changes — receipts are
 * sent as that user.
 *
 * Renders nothing.
 */
export function SpecialtyChatNotificationsController() {
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (isLoading || !session?.uid) return;
    return notifications.registerCenterExtension(
      createSpecialtyChatNotificationExtension(session),
    );
  }, [isLoading, session]);

  return null;
}
