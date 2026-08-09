import type { PermissionState } from "@/native-platform/permissions";

export const NativeNotificationPromptActions = {
  Hidden: "hidden",
  Request: "request",
  OpenSettings: "open-settings",
} as const;

export type NativeNotificationPromptAction =
  (typeof NativeNotificationPromptActions)[keyof typeof NativeNotificationPromptActions];

export interface NativeNotificationPromptContext {
  authenticated: boolean;
  nativePushSupported: boolean;
  deviceEnabled: boolean;
  permissionState: PermissionState;
}

/** Pure policy so login hydration, denied permissions, and old Android agree. */
export function resolveNativeNotificationPromptAction({
  authenticated,
  nativePushSupported,
  deviceEnabled,
  permissionState,
}: NativeNotificationPromptContext): NativeNotificationPromptAction {
  if (!authenticated || !nativePushSupported) {
    return NativeNotificationPromptActions.Hidden;
  }
  if (permissionState === "unsupported") {
    return NativeNotificationPromptActions.Hidden;
  }
  if (deviceEnabled && permissionState === "granted") {
    return NativeNotificationPromptActions.Hidden;
  }
  if (permissionState === "denied" || permissionState === "blocked") {
    return NativeNotificationPromptActions.OpenSettings;
  }
  return NativeNotificationPromptActions.Request;
}
