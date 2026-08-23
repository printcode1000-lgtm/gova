import type { FollowTargetType } from "@/features/follow";

export type FollowDialogMode =
  | "login_required"
  | "confirm_follow"
  | "confirm_unfollow"
  | "owner_actions"
  | "notify_followers"
  | "error"
  | "success";

export const targetLabels: Record<FollowTargetType, string> = {
  store: "مقدم الخدمة",
  product: "المنتج",
  category: "الفئة",
};

export const targetLabelsEn: Record<FollowTargetType, string> = {
  store: "Provider",
  product: "Product",
  category: "Category",
};

export function followDialogText(
  mode: FollowDialogMode,
  label: string,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  switch (mode) {
    case "login_required":
      return {
        title: t("follow.dialog.loginRequired.title"),
        body: t("follow.dialog.loginRequired.body", { label }),
        action: t("follow.dialog.loginRequired.action"),
      };
    case "confirm_follow":
      return {
        title: t("follow.dialog.confirmFollow.title"),
        body: t("follow.dialog.confirmFollow.body", { label }),
        action: t("follow.dialog.confirmFollow.action"),
      };
    case "confirm_unfollow":
      return {
        title: t("follow.dialog.confirmUnfollow.title"),
        body: t("follow.dialog.confirmUnfollow.body", { label }),
        action: t("follow.dialog.confirmUnfollow.action"),
      };
    case "owner_actions":
      return {
        title: t("follow.dialog.ownerActions.title"),
        body: t("follow.dialog.ownerActions.body", { label }),
        action: t("follow.dialog.ownerActions.action"),
      };
    case "notify_followers":
      return {
        title: t("follow.dialog.notification.title"),
        body: t("follow.dialog.notification.body", { label }),
        action: t("follow.dialog.notification.send"),
      };
    case "success":
      return {
        title: t("follow.dialog.success.title"),
        body: t("follow.dialog.success.body"),
        action: t("follow.dialog.success.action"),
      };
    case "error":
    default:
      return {
        title: t("follow.dialog.error.title"),
        body: t("follow.dialog.error.body"),
        action: t("follow.dialog.error.action"),
      };
  }
}
