import type { PermissionState } from "@/native-platform/permissions";

export const NotificationPromptActions = {
  Hidden: "hidden",
  Request: "request",
  OpenSettings: "open-settings",
} as const;

export type NotificationPromptAction =
  (typeof NotificationPromptActions)[keyof typeof NotificationPromptActions];

export interface NotificationPromptContext {
  authenticated: boolean;
  /** Native FCM/APNs, or Web Push in a secure browser context. */
  pushSupported: boolean;
  deviceEnabled: boolean;
  permissionState: PermissionState;
}

/**
 * Pure policy shared by every platform, so login hydration, denied
 * permissions, browsers without Web Push, and old Android all agree.
 */
export function resolveNotificationPromptAction({
  authenticated,
  pushSupported,
  deviceEnabled,
  permissionState,
}: NotificationPromptContext): NotificationPromptAction {
  if (!authenticated || !pushSupported) {
    return NotificationPromptActions.Hidden;
  }
  if (permissionState === "unsupported") {
    return NotificationPromptActions.Hidden;
  }
  if (deviceEnabled && permissionState === "granted") {
    return NotificationPromptActions.Hidden;
  }
  if (permissionState === "denied" || permissionState === "blocked") {
    return NotificationPromptActions.OpenSettings;
  }
  return NotificationPromptActions.Request;
}
