"use client";

import * as React from "react";
import { Bell, CheckCircle2, Heart, Loader2, Send, Users, XCircle } from "lucide-react";

import {
  ACTION_TILE_CLASS,
  ACTION_TILE_LABEL_CLASS,
  ACTION_TILE_STYLE,
  Button,
} from "@/shared/ui/button";
import { cn } from "@/shared/utils";
import { formatCount } from "@asol/format-core";
import { followApiService, type FollowStatus, type FollowTargetType } from "@/features/follow";
import { useTranslation } from "@/shared/i18n";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { useSession } from "@/features/auth/ui";
import {
  followDialogText,
  targetLabels,
  targetLabelsEn,
  type FollowDialogMode,
} from "./follow-dialog-text";

interface FollowButtonProps {
  targetType: FollowTargetType;
  targetId: string;
  targetOwnerUid?: string;
  viewerUid?: string;
  isOwner?: boolean;
  isSuperAdmin?: boolean;
  targetLabel?: string;
  className?: string;
  /** Registered UiRegistry descriptor for this instance, from the caller. */
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
  const { session } = useSession();
  const label = targetLabel || (locale === "ar" ? targetLabels[targetType] : targetLabelsEn[targetType]);
  const [status, setStatus] = React.useState<FollowStatus | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isMutating, setIsMutating] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<FollowDialogMode | null>(null);
  const [notificationTitle, setNotificationTitle] = React.useState("");
  const [notificationBody, setNotificationBody] = React.useState("");
  const [notificationResult, setNotificationResult] = React.useState<{
    requested: number;
    delivered: number;
    unavailable: number;
  } | null>(null);

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
    <Loader2 id="follow.follow-button.loader2" className="h-5 w-5 animate-spin" />
  ) : canManage ? (
    <Users id="follow.follow-button.users" className="h-5 w-5" />
  ) : (
    <Heart id="follow.follow-button.heart" className={cn("h-5 w-5", active && "fill-current")} />
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

  const sendFollowerNotification = async () => {
    if (!session?.sessionToken || isMutating) {
      setDialogMode("error");
      return;
    }
    setIsMutating(true);
    setNotificationResult(null);
    try {
      const requestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const result = await followApiService.notifyFollowers({
        identity: { uid: session.uid, phone: session.phone },
        sessionToken: session.sessionToken,
        targetType,
        targetId,
        targetOwnerUid,
        title: notificationTitle,
        body: notificationBody,
        requestId,
      });
      setNotificationResult({
        requested: result.requested,
        delivered: result.delivered,
        unavailable: result.unavailable,
      });
    } catch {
      setDialogMode("error");
    } finally {
      setIsMutating(false);
    }
  };

  const textForDialog = dialogMode ? followDialogText(dialogMode, label, t) : null;

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
        <span id="follow.follow-button.span" className="relative flex">
          {icon}
          <span id="follow.follow-button.span.2" className="absolute -top-2 -end-3 min-w-4 rounded-full bg-primary/10 px-1 text-[10px] font-semibold leading-4 text-primary">
            {formatCount(count, locale)}
          </span>
        </span>
        <span id="follow.follow-button.span.3" className={ACTION_TILE_LABEL_CLASS}>{text}</span>
      </Button>

      {dialogMode && textForDialog ? (
        <div id="follow.follow-button.div" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div id="follow.follow-button.div.2" className="w-full max-w-sm rounded-xl bg-surface p-4 shadow-xl">
            <div id="follow.follow-button.div.3" className="flex items-start gap-3">
              <div id="follow.follow-button.div.4" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {dialogMode === "notify_followers" ? (
                  <Bell id="follow.follow-button.bell" className="h-5 w-5" />
                ) : canManage ? (
                  <Users id="follow.follow-button.users.2" className="h-5 w-5" />
                ) : (
                  <Heart id="follow.follow-button.heart.2" className="h-5 w-5" />
                )}
              </div>
              <div id="follow.follow-button.div.5" className="min-w-0 flex-1">
                <h3 id="follow.follow-button.h3" className="text-sm font-semibold text-on-surface">
                  {textForDialog.title}
                </h3>
                <p id="follow.follow-button.p" className="mt-1 text-xs leading-5 text-on-surface-variant">
                  {textForDialog.body}
                </p>
              </div>
            </div>

            {dialogMode === "owner_actions" ? (
              <div id="follow.follow-button.div.6" className="mt-4 space-y-2">
                <div id="follow.follow-button.div.7" className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                  {t("follow.dialog.followerCount")}:{" "}
                  <span id="follow.follow-button.span.4" className="font-semibold text-on-surface">
                    {formatCount(count, locale)}
                  </span>
                </div>
                <Button id="follow.follow-button.button"
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setNotificationResult(null);
                    setDialogMode("notify_followers");
                  }}
                >
                  <Bell id="follow.follow-button.bell.2" className="h-4 w-4" />
                  {t("follow.dialog.notifyFollowers")}
                  <span id="follow.follow-button.span.5" className="ms-auto text-xs text-on-surface-variant">
                    {t("follow.dialog.notification.availableBadge")}
                  </span>
                </Button>
                <p id="follow.follow-button.p.2" className="px-1 text-[11px] leading-5 text-on-surface-variant">
                  {t("follow.dialog.notification.deliveryHint")}
                </p>
              </div>
            ) : null}

            {dialogMode === "notify_followers" ? (
              <div id="follow.follow-button.div.8" className="mt-4 space-y-3">
                <div id="follow.follow-button.div.9" className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div id="follow.follow-button.div.10" className="rounded-lg border border-outline-variant bg-surface-container-low p-2">
                    <span id="follow.follow-button.span.6" className="block text-on-surface-variant">
                      {t("follow.dialog.followerCount")}
                    </span>
                    <strong className="mt-1 block text-base text-on-surface">
                      {formatCount(count, locale)}
                    </strong>
                  </div>
                  <div id="follow.follow-button.div.11" className="rounded-lg border border-outline-variant bg-surface-container-low p-2">
                    <span id="follow.follow-button.span.7" className="block text-on-surface-variant">
                      {t("follow.dialog.notification.channel")}
                    </span>
                    <strong className="mt-1 block text-sm text-on-surface">
                      {t("follow.dialog.notification.pushAndCenter")}
                    </strong>
                  </div>
                </div>
                <div id="follow.follow-button.div.12" className="space-y-1.5">
                  <Label id="follow.follow-button.label" htmlFor={`follower-notification-title-${targetId}`}>
                    {t("follow.dialog.notification.titleLabel")}
                  </Label>
                  <Input
                    id={`follower-notification-title-${targetId}`}
                    value={notificationTitle}
                    maxLength={120}
                    onChange={(event) => setNotificationTitle(event.target.value)}
                    placeholder={t("follow.dialog.notification.titlePlaceholder")}
                  />
                  <p id="follow.follow-button.p.3" className="text-end text-[10px] text-on-surface-variant">
                    {notificationTitle.length}/120
                  </p>
                </div>
                <div id="follow.follow-button.div.13" className="space-y-1.5">
                  <Label id="follow.follow-button.label.2" htmlFor={`follower-notification-body-${targetId}`}>
                    {t("follow.dialog.notification.messageLabel")}
                  </Label>
                  <Textarea
                    id={`follower-notification-body-${targetId}`}
                    value={notificationBody}
                    maxLength={1000}
                    rows={4}
                    onChange={(event) => setNotificationBody(event.target.value)}
                    placeholder={t("follow.dialog.notification.messagePlaceholder")}
                  />
                  <p id="follow.follow-button.p.4" className="text-end text-[10px] text-on-surface-variant">
                    {notificationBody.length}/1000
                  </p>
                </div>
                {notificationResult ? (
                  <div id="follow.follow-button.div.14" className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-xs">
                    <p id="follow.follow-button.p.5" className="mb-2 font-semibold text-on-surface">
                      {t("follow.dialog.notification.resultTitle")}
                    </p>
                    <div id="follow.follow-button.div.15" className="grid grid-cols-3 gap-2 text-center">
                      <span id="follow.follow-button.span.8">{t("follow.dialog.notification.requested")}<strong className="block text-sm">{notificationResult.requested}</strong></span>
                      <span id="follow.follow-button.span.9" className="text-success"><CheckCircle2 id="follow.follow-button.check-circle2" className="mx-auto mb-1 h-4 w-4" />{t("follow.dialog.notification.delivered")}<strong className="block text-sm">{notificationResult.delivered}</strong></span>
                      <span id="follow.follow-button.span.10" className="text-error"><XCircle id="follow.follow-button.xcircle" className="mx-auto mb-1 h-4 w-4" />{t("follow.dialog.notification.unavailable")}<strong className="block text-sm">{notificationResult.unavailable}</strong></span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div id="follow.follow-button.div.16" className="mt-4 flex justify-end gap-2">
              {dialogMode === "confirm_follow" || dialogMode === "confirm_unfollow" ? (
                <>
                  <Button id="follow.follow-button.button.2"
                    type="button"
                    variant="ghost"
                    onClick={() => setDialogMode(null)}
                    disabled={isMutating}
                  >
                    إلغاء
                  </Button>
                  <Button id="follow.follow-button.button.3"
                    type="button"
                    onClick={runMutation}
                    disabled={isMutating}
                    className="gap-2"
                  >
                    {isMutating ? (
                      <Loader2 id="follow.follow-button.loader2.2" className="h-4 w-4 animate-spin" />
                    ) : null}
                    {textForDialog.action}
                  </Button>
                </>
              ) : dialogMode === "notify_followers" ? (
                <>
                  <Button id="follow.follow-button.button.4"
                    type="button"
                    variant="ghost"
                    onClick={() => setDialogMode("owner_actions")}
                    disabled={isMutating}
                  >
                    {t("follow.dialog.notification.back")}
                  </Button>
                  <Button id="follow.follow-button.button.5"
                    type="button"
                    className="gap-2"
                    onClick={() => void sendFollowerNotification()}
                    disabled={
                      isMutating ||
                      !session?.sessionToken ||
                      !notificationTitle.trim() ||
                      !notificationBody.trim() ||
                      count === 0
                    }
                  >
                    {isMutating ? <Loader2 id="follow.follow-button.loader2.3" className="h-4 w-4 animate-spin" /> : <Send id="follow.follow-button.send" className="h-4 w-4" />}
                    {textForDialog.action}
                  </Button>
                </>
              ) : (
                <Button id="follow.follow-button.button.6" type="button" onClick={() => setDialogMode(null)}>
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
