import type { NotificationPermissionStateName } from "@/features/notifications";

export function notificationPermissionLabel(
  currentPermission: NotificationPermissionStateName | string,
  permissionBlocked: boolean,
  t: (key: string) => string,
) {
  return currentPermission === "granted"
    ? t("notifications.deviceCard.statusGranted")
    : permissionBlocked
      ? t("notifications.deviceCard.statusBlocked")
      : currentPermission === "default" || currentPermission === "prompt"
        ? t("notifications.deviceCard.statusPrompt")
        : t("notifications.deviceCard.statusUnsupported");
}

export function notificationPermissionTone(
  currentPermission: NotificationPermissionStateName | string,
  permissionBlocked: boolean,
) {
  return currentPermission === "granted"
    ? "bg-primary/10 text-primary"
    : permissionBlocked
      ? "bg-error/10 text-error"
      : "bg-surface-variant text-on-surface-variant";
}
