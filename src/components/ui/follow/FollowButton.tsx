"use client";

import * as React from "react";
import { Bell, Heart, Loader2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { followApiService, type FollowStatus, type FollowTargetType } from "@/features/follow";

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

function formatCount(value: number): string {
  return new Intl.NumberFormat("ar-EG").format(Math.max(0, value));
}

function dialogText(mode: DialogMode, label: string) {
  switch (mode) {
    case "login_required":
      return {
        title: "تسجيل الدخول مطلوب",
        body: `يجب تسجيل الدخول حتى تتمكن من متابعة ${label}.`,
        action: "تسجيل الدخول لاحقًا",
      };
    case "confirm_follow":
      return {
        title: "تأكيد المتابعة",
        body: `سوف تقوم بمتابعة ${label}. يمكنك إلغاء المتابعة في أي وقت.`,
        action: "متابعة",
      };
    case "confirm_unfollow":
      return {
        title: "تأكيد إلغاء المتابعة",
        body: `سوف تلغي متابعة ${label}.`,
        action: "إلغاء المتابعة",
      };
    case "owner_actions":
      return {
        title: "إجراءات المتابعين",
        body: `يمكنك إدارة متابعي ${label} من هنا. بعض الإجراءات ستفعل لاحقًا.`,
        action: "إغلاق",
      };
    case "coming_soon":
      return {
        title: "قيد التجهيز",
        body: "إرسال إشعار للمتابعين سيتم تفعيله لاحقًا من خلال نظام الإشعارات.",
        action: "حسنًا",
      };
    case "success":
      return {
        title: "تم بنجاح",
        body: "تم تحديث حالة المتابعة.",
        action: "حسنًا",
      };
    case "error":
    default:
      return {
        title: "تعذر تنفيذ العملية",
        body: "حدث خطأ أثناء تحديث المتابعة. حاول مرة أخرى.",
        action: "حسنًا",
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
  const label = targetLabel || targetLabels[targetType];
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
    ? "إجراءات المتابعين"
    : active
      ? "إلغاء المتابعة"
      : "متابعة";
  const icon = isLoading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : canManage ? (
    <Users className="h-4 w-4" />
  ) : (
    <Heart className={cn("h-4 w-4", active && "fill-current")} />
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

  const textForDialog = dialogMode ? dialogText(dialogMode, label) : null;

  return (
    <>
      <Button
        type="button"
        variant={active && !canManage ? "secondary" : "outline"}
        onClick={openPrimaryDialog}
        disabled={isLoading || !targetId}
        className={cn("gap-2", className)}
      >
        {icon}
        <span>{text}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {formatCount(count)}
        </span>
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
                  عدد المتابعين:{" "}
                  <span className="font-semibold text-on-surface">
                    {formatCount(count)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setDialogMode("coming_soon")}
                >
                  <Bell className="h-4 w-4" />
                  إرسال إشعار للمتابعين
                  <span className="ms-auto text-xs text-on-surface-variant">
                    قريبًا
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
