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
import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";
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
  ui?: UiDescriptor;
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
  ui,
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
      <Button ui={{ uid: "follow.toggle-67YSTM", id: "follow.toggle", kind: "action", action: "open-follow-dialog", part: "primary" }}
        {...(ui ? uiAttributes(ui) : {})}
        type="button"
        variant={active && !canManage ? "secondary" : "outline"}
        onClick={openPrimaryDialog}
        disabled={isLoading || !targetId}
        className={cn(ACTION_TILE_CLASS, className)}
        style={ACTION_TILE_STYLE}
      >
        <span {...uiAttributes({ uid: "follow.follow-button.span.11-EF6H2j", id: "follow.follow-button.span.11" })} id="follow.follow-button.span" className="relative flex">
          {icon}
          <span {...uiAttributes({ uid: "follow.follow-button.span.12-CT366b", id: "follow.follow-button.span.12" })} id="follow.follow-button.span.2" className="absolute -top-2 -end-3 min-w-4 rounded-full bg-primary/10 px-1 text-[10px] font-semibold leading-4 text-primary">
            {formatCount(count, locale)}
          </span>
        </span>
        <span {...uiAttributes({ uid: "follow.follow-button.span.13-mQ5HAQ", id: "follow.follow-button.span.13" })} id="follow.follow-button.span.3" className={ACTION_TILE_LABEL_CLASS}>{text}</span>
      </Button>

      {dialogMode && textForDialog ? (
        <div {...uiAttributes({ uid: "follow.follow-button.div.17-Df4KZj", id: "follow.follow-button.div.17" })} id="follow.follow-button.div" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div {...uiAttributes({ uid: "follow.follow-button.div.18-jVHZO8", id: "follow.follow-button.div.18" })} id="follow.follow-button.div.2" className="w-full max-w-sm rounded-xl bg-surface p-4 shadow-xl">
            <div {...uiAttributes({ uid: "follow.follow-button.div.19-31LRC4", id: "follow.follow-button.div.19" })} id="follow.follow-button.div.3" className="flex items-start gap-3">
              <div {...uiAttributes({ uid: "follow.follow-button.div.20-BvtA3N", id: "follow.follow-button.div.20" })} id="follow.follow-button.div.4" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {dialogMode === "notify_followers" ? (
                  <Bell id="follow.follow-button.bell" className="h-5 w-5" />
                ) : canManage ? (
                  <Users id="follow.follow-button.users.2" className="h-5 w-5" />
                ) : (
                  <Heart id="follow.follow-button.heart.2" className="h-5 w-5" />
                )}
              </div>
              <div {...uiAttributes({ uid: "follow.follow-button.div.21-jRT6jU", id: "follow.follow-button.div.21" })} id="follow.follow-button.div.5" className="min-w-0 flex-1">
                <h3 {...uiAttributes({ uid: "follow.follow-button.h3.2-3S8RAo", id: "follow.follow-button.h3.2" })} id="follow.follow-button.h3" className="text-sm font-semibold text-on-surface">
                  {textForDialog.title}
                </h3>
                <p {...uiAttributes({ uid: "follow.follow-button.p.6-MEmO61", id: "follow.follow-button.p.6" })} id="follow.follow-button.p" className="mt-1 text-xs leading-5 text-on-surface-variant">
                  {textForDialog.body}
                </p>
              </div>
            </div>

            {dialogMode === "owner_actions" ? (
              <div {...uiAttributes({ uid: "follow.follow-button.div.22-UGaU13", id: "follow.follow-button.div.22" })} id="follow.follow-button.div.6" className="mt-4 space-y-2">
                <div {...uiAttributes({ uid: "follow.follow-button.div.23-xNTG7l", id: "follow.follow-button.div.23" })} id="follow.follow-button.div.7" className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                  {t("follow.dialog.followerCount")}:{" "}
                  <span {...uiAttributes({ uid: "follow.follow-button.span.14-G9N5Ik", id: "follow.follow-button.span.14" })} id="follow.follow-button.span.4" className="font-semibold text-on-surface">
                    {formatCount(count, locale)}
                  </span>
                </div>
                <Button id="follow.follow-button.button" ui={{ uid: "follow.dialog.notify-followers-X9TWY5", id: "follow.dialog.notify-followers", kind: "action", action: "open-notify-followers", part: "dialog" }}
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
                  <span {...uiAttributes({ uid: "follow.follow-button.span.15-gd7P6P", id: "follow.follow-button.span.15" })} id="follow.follow-button.span.5" className="ms-auto text-xs text-on-surface-variant">
                    {t("follow.dialog.notification.availableBadge")}
                  </span>
                </Button>
                <p {...uiAttributes({ uid: "follow.follow-button.p.7-V4RAN2", id: "follow.follow-button.p.7" })} id="follow.follow-button.p.2" className="px-1 text-[11px] leading-5 text-on-surface-variant">
                  {t("follow.dialog.notification.deliveryHint")}
                </p>
              </div>
            ) : null}

            {dialogMode === "notify_followers" ? (
              <div {...uiAttributes({ uid: "follow.follow-button.div.24-aRzU09", id: "follow.follow-button.div.24" })} id="follow.follow-button.div.8" className="mt-4 space-y-3">
                <div {...uiAttributes({ uid: "follow.follow-button.div.25-6GKj61", id: "follow.follow-button.div.25" })} id="follow.follow-button.div.9" className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div {...uiAttributes({ uid: "follow.follow-button.div.26-pVTMQ9", id: "follow.follow-button.div.26" })} id="follow.follow-button.div.10" className="rounded-lg border border-outline-variant bg-surface-container-low p-2">
                    <span {...uiAttributes({ uid: "follow.follow-button.span.16-w6VPYh", id: "follow.follow-button.span.16" })} id="follow.follow-button.span.6" className="block text-on-surface-variant">
                      {t("follow.dialog.followerCount")}
                    </span>
                    <strong className="mt-1 block text-base text-on-surface">
                      {formatCount(count, locale)}
                    </strong>
                  </div>
                  <div {...uiAttributes({ uid: "follow.follow-button.div.27-Vk6kFp", id: "follow.follow-button.div.27" })} id="follow.follow-button.div.11" className="rounded-lg border border-outline-variant bg-surface-container-low p-2">
                    <span {...uiAttributes({ uid: "follow.follow-button.span.17-P2o8Qb", id: "follow.follow-button.span.17" })} id="follow.follow-button.span.7" className="block text-on-surface-variant">
                      {t("follow.dialog.notification.channel")}
                    </span>
                    <strong className="mt-1 block text-sm text-on-surface">
                      {t("follow.dialog.notification.pushAndCenter")}
                    </strong>
                  </div>
                </div>
                <div {...uiAttributes({ uid: "follow.follow-button.div.28-v3jRnF", id: "follow.follow-button.div.28" })} id="follow.follow-button.div.12" className="space-y-1.5">
                  <Label id="follow.follow-button.label" htmlFor={`follower-notification-title-${targetId}`}>
                    {t("follow.dialog.notification.titleLabel")}
                  </Label>
                  <Input ui={{ uid: "follow.dialog.notification-title-V3MF1S", id: "follow.dialog.notification-title", kind: "field", part: "dialog" }}
                    id={`follower-notification-title-${targetId}`}
                    value={notificationTitle}
                    maxLength={120}
                    onChange={(event) => setNotificationTitle(event.target.value)}
                    placeholder={t("follow.dialog.notification.titlePlaceholder")}
                  />
                  <p {...uiAttributes({ uid: "follow.follow-button.p.8-NRUV0e", id: "follow.follow-button.p.8" })} id="follow.follow-button.p.3" className="text-end text-[10px] text-on-surface-variant">
                    {notificationTitle.length}/120
                  </p>
                </div>
                <div {...uiAttributes({ uid: "follow.follow-button.div.29-ovzK4r", id: "follow.follow-button.div.29" })} id="follow.follow-button.div.13" className="space-y-1.5">
                  <Label id="follow.follow-button.label.2" htmlFor={`follower-notification-body-${targetId}`}>
                    {t("follow.dialog.notification.messageLabel")}
                  </Label>
                  <Textarea ui={{ uid: "follow.dialog.notification-body-T7WPo6", id: "follow.dialog.notification-body", kind: "field", part: "dialog" }}
                    id={`follower-notification-body-${targetId}`}
                    value={notificationBody}
                    maxLength={1000}
                    rows={4}
                    onChange={(event) => setNotificationBody(event.target.value)}
                    placeholder={t("follow.dialog.notification.messagePlaceholder")}
                  />
                  <p {...uiAttributes({ uid: "follow.follow-button.p.9-R8tAzP", id: "follow.follow-button.p.9" })} id="follow.follow-button.p.4" className="text-end text-[10px] text-on-surface-variant">
                    {notificationBody.length}/1000
                  </p>
                </div>
                {notificationResult ? (
                  <div {...uiAttributes({ uid: "follow.follow-button.div.30-CBZEc5", id: "follow.follow-button.div.30" })} id="follow.follow-button.div.14" className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-xs">
                    <p {...uiAttributes({ uid: "follow.follow-button.p.10-Y9Ohju", id: "follow.follow-button.p.10" })} id="follow.follow-button.p.5" className="mb-2 font-semibold text-on-surface">
                      {t("follow.dialog.notification.resultTitle")}
                    </p>
                    <div {...uiAttributes({ uid: "follow.follow-button.div.31-DrqI6r", id: "follow.follow-button.div.31" })} id="follow.follow-button.div.15" className="grid grid-cols-3 gap-2 text-center">
                      <span {...uiAttributes({ uid: "follow.follow-button.span.18-tOo845", id: "follow.follow-button.span.18" })} id="follow.follow-button.span.8">{t("follow.dialog.notification.requested")}<strong className="block text-sm">{notificationResult.requested}</strong></span>
                      <span {...uiAttributes({ uid: "follow.follow-button.span.19-ChDLV5", id: "follow.follow-button.span.19" })} id="follow.follow-button.span.9" className="text-success"><CheckCircle2 id="follow.follow-button.check-circle2" className="mx-auto mb-1 h-4 w-4" />{t("follow.dialog.notification.delivered")}<strong className="block text-sm">{notificationResult.delivered}</strong></span>
                      <span {...uiAttributes({ uid: "follow.follow-button.span.20-3QHSeZ", id: "follow.follow-button.span.20" })} id="follow.follow-button.span.10" className="text-error"><XCircle id="follow.follow-button.xcircle" className="mx-auto mb-1 h-4 w-4" />{t("follow.dialog.notification.unavailable")}<strong className="block text-sm">{notificationResult.unavailable}</strong></span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div {...uiAttributes({ uid: "follow.follow-button.div.32-PLfY97", id: "follow.follow-button.div.32" })} id="follow.follow-button.div.16" className="mt-4 flex justify-end gap-2">
              {dialogMode === "confirm_follow" || dialogMode === "confirm_unfollow" ? (
                <>
                  <Button id="follow.follow-button.button.2" ui={{ uid: "follow.dialog.cancel-sY4H81", id: "follow.dialog.cancel", kind: "action", action: "cancel", part: "dialog-footer" }}
                    type="button"
                    variant="ghost"
                    onClick={() => setDialogMode(null)}
                    disabled={isMutating}
                  >
                    إلغاء
                  </Button>
                  <Button id="follow.follow-button.button.3" ui={{ uid: "follow.dialog.confirm-PG61Dl", id: "follow.dialog.confirm", kind: "action", action: "confirm", part: "dialog-footer" }}
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
                  <Button id="follow.follow-button.button.4" ui={{ uid: "follow.dialog.owner-actions-m6nu1L", id: "follow.dialog.owner-actions", kind: "action", action: "open-owner-actions", part: "dialog-footer" }}
                    type="button"
                    variant="ghost"
                    onClick={() => setDialogMode("owner_actions")}
                    disabled={isMutating}
                  >
                    {t("follow.dialog.notification.back")}
                  </Button>
                  <Button id="follow.follow-button.button.5" ui={{ uid: "follow.dialog.send-notification-Ojkt6S", id: "follow.dialog.send-notification", kind: "action", action: "send-follower-notification", part: "dialog-footer" }}
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
                <Button id="follow.follow-button.button.6" ui={{ uid: "follow.dialog.close-j0lNFc", id: "follow.dialog.close", kind: "action", action: "close", part: "dialog-footer" }} type="button" onClick={() => setDialogMode(null)}>
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
