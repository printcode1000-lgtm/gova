"use client";

import * as React from "react";
import { Bell, Heart, Loader2, Users } from "lucide-react";

import {
  ACTION_TILE_CLASS,
  ACTION_TILE_LABEL_CLASS,
  ACTION_TILE_STYLE,
  Button,
} from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { followApiService, type FollowStatus, type FollowTargetType } from "@/features/follow";
import { useTranslation } from "@/lib/i18n";

type DialogMode =
  | "login_required"
  | "confirm_follow"
  | "confirm_unfollow"
  | "owner_actions"
  | "coming_soon"
  | "error"
  | "success";

interface FollowButtonProps {
  targetType: FollowTargetType;
  targetId: string;
  targetOwnerUid?: string;
  viewerUid?: string;
  isOwner?: boolean;
  isSuperAdmin?: boolean;
  targetLabel?: string;
  className?: string;
}

const targetLabels: Record<FollowTargetType, string> = {
  store: "مقدم الخدمة",
  product: "المنتج",
  category: "الفئة",
};

const targetLabelsEn: Record<FollowTargetType, string> = {
  store: "Provider",
  product: "Product",
  category: "Category",
};

function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(Math.max(0, value));
}

function dialogText(mode: DialogMode, label: string, t: (key: string, params?: Record<string, string | number>) => string) {
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
    case "coming_soon":
      return {
        title: t("follow.dialog.comingSoon.title"),
        body: t("follow.dialog.comingSoon.body"),
        action: t("follow.dialog.comingSoon.action"),
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

export function FollowButton({
  targetType,
  targetId,
  targetOwnerUid,
  viewerUid,
  isOwner = false,
  isSuperAdmin = false,
  targetLabel,
  className,
}: FollowButtonProps) {
  const { t, locale } = useTranslation();
  const label = targetLabel || (locale === "ar" ? targetLabels[targetType] : targetLabelsEn[targetType]);
  const [status, setStatus] = React.useState<FollowStatus | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isMutating, setIsMutating] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<DialogMode | null>(null);

  const canManage =
    isOwner ||
    isSuperAdmin ||
    Boolean(viewerUid && targetOwnerUid && viewerUid === targetOwnerUid);

  const loadStatus = React.useCallback(async () => {
    if (!targetId) return;
    setIsLoading(true);
    try {
      setStatus(
        await followApiService.getStatus({
          targetType,
          targetId,
          targetOwnerUid,
          viewerUid,
        }),
      );
    } catch {
      setStatus({
        targetType,
        targetId,
        followerCount: 0,
        isFollowing: false,
        canFollow: Boolean(viewerUid),
        reason: viewerUid ? undefined : "login_required",
      });
    } finally {
      setIsLoading(false);
    }
  }, [targetId, targetOwnerUid, targetType, viewerUid]);

  React.useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const count = status?.followerCount ?? 0;
  const active = status?.isFollowing ?? false;
  const text = canManage
    ? t("follow.button.followers")
    : active
      ? t("follow.button.unfollow")
      : t("follow.button.follow");
  const icon = isLoading ? (
    <Loader2 className="h-5 w-5 animate-spin" />
  ) : canManage ? (
    <Users className="h-5 w-5" />
  ) : (
    <Heart className={cn("h-5 w-5", active && "fill-current")} />
  );

  const openPrimaryDialog = () => {
    if (canManage) {
      setDialogMode("owner_actions");
      return;
    }
    if (!viewerUid) {
      setDialogMode("login_required");
      return;
    }
    setDialogMode(active ? "confirm_unfollow" : "confirm_follow");
  };

  const runMutation = async () => {
    if (!viewerUid) {
      setDialogMode("login_required");
      return;
    }
    setIsMutating(true);
    try {
      const payload = { targetType, targetId, targetOwnerUid, viewerUid };
      const next = active
        ? await followApiService.unfollow(payload)
        : await followApiService.follow(payload);
      setStatus(next);
      setDialogMode("success");
    } catch {
      setDialogMode("error");
    } finally {
      setIsMutating(false);
    }
  };

  const textForDialog = dialogMode ? dialogText(dialogMode, label, t) : null;

  return (
    <>
      <Button
        type="button"
        variant={active && !canManage ? "secondary" : "outline"}
        onClick={openPrimaryDialog}
        disabled={isLoading || !targetId}
        className={cn(ACTION_TILE_CLASS, className)}
        style={ACTION_TILE_STYLE}
      >
        <span className="relative flex">
          {icon}
          <span className="absolute -top-2 -end-3 min-w-4 rounded-full bg-primary/10 px-1 text-[10px] font-semibold leading-4 text-primary">
            {formatCount(count, locale)}
          </span>
        </span>
        <span className={ACTION_TILE_LABEL_CLASS}>{text}</span>
      </Button>

      {dialogMode && textForDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-surface p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {dialogMode === "coming_soon" ? (
                  <Bell className="h-5 w-5" />
                ) : canManage ? (
                  <Users className="h-5 w-5" />
                ) : (
                  <Heart className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-on-surface">
                  {textForDialog.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                  {textForDialog.body}
                </p>
              </div>
            </div>

            {dialogMode === "owner_actions" ? (
              <div className="mt-4 space-y-2">
                <div className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                  {t("follow.dialog.followerCount")}:{" "}
                  <span className="font-semibold text-on-surface">
                    {formatCount(count, locale)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setDialogMode("coming_soon")}
                >
                  <Bell className="h-4 w-4" />
                  {t("follow.dialog.notifyFollowers")}
                  <span className="ms-auto text-xs text-on-surface-variant">
                    {t("follow.dialog.comingSoonBadge")}
                  </span>
                </Button>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              {dialogMode === "confirm_follow" ||
              dialogMode === "confirm_unfollow" ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDialogMode(null)}
                    disabled={isMutating}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    onClick={runMutation}
                    disabled={isMutating}
                    className="gap-2"
                  >
                    {isMutating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {textForDialog.action}
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => setDialogMode(null)}>
                  {textForDialog.action}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
