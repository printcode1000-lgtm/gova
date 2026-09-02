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
    <Loader2 id='features-follow-presentation-followbutton-loader2-1-vpgwox' className="h-5 w-5 animate-spin" />
  ) : canManage ? (
    <Users id='features-follow-presentation-followbutton-users-2-eef1qo' className="h-5 w-5" />
  ) : (
    <Heart id='features-follow-presentation-followbutton-heart-3-zgbxpi' className={cn("h-5 w-5", active && "fill-current")} />
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
        <span id='features-follow-presentation-followbutton-text-4-tm8h0n' className="relative flex">
          {icon}
          <span id='features-follow-presentation-followbutton-text-5-8dh8ps' className="absolute -top-2 -end-3 min-w-4 rounded-full bg-primary/10 px-1 text-[10px] font-semibold leading-4 text-primary">
            {formatCount(count, locale)}
          </span>
        </span>
        <span id='features-follow-presentation-followbutton-text-6-nlrhpo' className={ACTION_TILE_LABEL_CLASS}>{text}</span>
      </Button>

      {dialogMode && textForDialog ? (
        <div id='features-follow-presentation-followbutton-div-7-fvmqkg' className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div id='features-follow-presentation-followbutton-div-8-mqkwvi' className="w-full max-w-sm rounded-xl bg-surface p-4 shadow-xl">
            <div id='features-follow-presentation-followbutton-div-9-nsvagk' className="flex items-start gap-3">
              <div id='features-follow-presentation-followbutton-div-10-z4hdn7' className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {dialogMode === "notify_followers" ? (
                  <Bell id='features-follow-presentation-followbutton-bell-11-fnsa5i' className="h-5 w-5" />
                ) : canManage ? (
                  <Users id='features-follow-presentation-followbutton-users-12-zgavwe' className="h-5 w-5" />
                ) : (
                  <Heart id='features-follow-presentation-followbutton-heart-13-hgifxg' className="h-5 w-5" />
                )}
              </div>
              <div id='features-follow-presentation-followbutton-div-14-4jhdqv' className="min-w-0 flex-1">
                <h3 id='features-follow-presentation-followbutton-heading-15-fvu30d' className="text-sm font-semibold text-on-surface">
                  {textForDialog.title}
                </h3>
                <p id='features-follow-presentation-followbutton-text-16-h7zcys' className="mt-1 text-xs leading-5 text-on-surface-variant">
                  {textForDialog.body}
                </p>
              </div>
            </div>

            {dialogMode === "owner_actions" ? (
              <div id='features-follow-presentation-followbutton-div-17-mmbhll' className="mt-4 space-y-2">
                <div id='features-follow-presentation-followbutton-div-18-fgrj3x' className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                  {t("follow.dialog.followerCount")}:{" "}
                  <span id='features-follow-presentation-followbutton-text-19-ckhf6t' className="font-semibold text-on-surface">
                    {formatCount(count, locale)}
                  </span>
                </div>
                <Button id='features-follow-presentation-followbutton-button-20-tjcrn5'
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setNotificationResult(null);
                    setDialogMode("notify_followers");
                  }}
                >
                  <Bell id='features-follow-presentation-followbutton-bell-21-0tcy9g' className="h-4 w-4" />
                  {t("follow.dialog.notifyFollowers")}
                  <span id='features-follow-presentation-followbutton-text-22-phlrhw' className="ms-auto text-xs text-on-surface-variant">
                    {t("follow.dialog.notification.availableBadge")}
                  </span>
                </Button>
                <p id='features-follow-presentation-followbutton-text-23-xe5m4u' className="px-1 text-[11px] leading-5 text-on-surface-variant">
                  {t("follow.dialog.notification.deliveryHint")}
                </p>
              </div>
            ) : null}

            {dialogMode === "notify_followers" ? (
              <div id='features-follow-presentation-followbutton-div-24-o2w2oq' className="mt-4 space-y-3">
                <div id='features-follow-presentation-followbutton-div-25-vztrhn' className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div id='features-follow-presentation-followbutton-div-26-og8jql' className="rounded-lg border border-outline-variant bg-surface-container-low p-2">
                    <span id='features-follow-presentation-followbutton-text-27-1c5mxe' className="block text-on-surface-variant">
                      {t("follow.dialog.followerCount")}
                    </span>
                    <strong id="features-follow-presentation-followbutton-strong-28-khhr5c" className="mt-1 block text-base text-on-surface">
                      {formatCount(count, locale)}
                    </strong>
                  </div>
                  <div id='features-follow-presentation-followbutton-div-29-po7yjx' className="rounded-lg border border-outline-variant bg-surface-container-low p-2">
                    <span id='features-follow-presentation-followbutton-text-30-8i5lxp' className="block text-on-surface-variant">
                      {t("follow.dialog.notification.channel")}
                    </span>
                    <strong id="features-follow-presentation-followbutton-strong-31-ralz3q" className="mt-1 block text-sm text-on-surface">
                      {t("follow.dialog.notification.pushAndCenter")}
                    </strong>
                  </div>
                </div>
                <div id='features-follow-presentation-followbutton-div-32-aztbej' className="space-y-1.5">
                  <Label id='features-follow-presentation-followbutton-label-33-dafkvy' htmlFor="follow-button-follow-button-input-f32eed">
                    {t("follow.dialog.notification.titleLabel")}
                  </Label>
                  <Input
                    id="follow-button-follow-button-input-f32eed"
                    value={notificationTitle}
                    maxLength={120}
                    onChange={(event) => setNotificationTitle(event.target.value)}
                    placeholder={t("follow.dialog.notification.titlePlaceholder")}
                  />
                  <p id='features-follow-presentation-followbutton-text-35-tjbhjy' className="text-end text-[10px] text-on-surface-variant">
                    {notificationTitle.length}/120
                  </p>
                </div>
                <div id='features-follow-presentation-followbutton-div-36-aajhbi' className="space-y-1.5">
                  <Label id='features-follow-presentation-followbutton-label-37-lbonvw' htmlFor="follow-button-follow-button-textarea-8ad2bd">
                    {t("follow.dialog.notification.messageLabel")}
                  </Label>
                  <Textarea
                    id="follow-button-follow-button-textarea-8ad2bd"
                    value={notificationBody}
                    maxLength={1000}
                    rows={4}
                    onChange={(event) => setNotificationBody(event.target.value)}
                    placeholder={t("follow.dialog.notification.messagePlaceholder")}
                  />
                  <p id='features-follow-presentation-followbutton-text-39-71twkh' className="text-end text-[10px] text-on-surface-variant">
                    {notificationBody.length}/1000
                  </p>
                </div>
                {notificationResult ? (
                  <div id='features-follow-presentation-followbutton-div-40-arfnly' className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-xs">
                    <p id='features-follow-presentation-followbutton-text-41-bfvlfa' className="mb-2 font-semibold text-on-surface">
                      {t("follow.dialog.notification.resultTitle")}
                    </p>
                    <div id='features-follow-presentation-followbutton-div-42-cqfrpl' className="grid grid-cols-3 gap-2 text-center">
                      <span id='features-follow-presentation-followbutton-text-43-rmp95n'>{t("follow.dialog.notification.requested")}<strong id="features-follow-presentation-followbutton-strong-44-lts97q" className="block text-sm">{notificationResult.requested}</strong></span>
                      <span id='features-follow-presentation-followbutton-text-45-yv3ocs' className="text-success"><CheckCircle2 id='features-follow-presentation-followbutton-checkcircle2-46-y6bi2x' className="mx-auto mb-1 h-4 w-4" />{t("follow.dialog.notification.delivered")}<strong id="features-follow-presentation-followbutton-strong-47-uilybz" className="block text-sm">{notificationResult.delivered}</strong></span>
                      <span id='features-follow-presentation-followbutton-text-48-pko2eo' className="text-error"><XCircle id='features-follow-presentation-followbutton-xcircle-49-f20hxl' className="mx-auto mb-1 h-4 w-4" />{t("follow.dialog.notification.unavailable")}<strong id="features-follow-presentation-followbutton-strong-50-fasbsz" className="block text-sm">{notificationResult.unavailable}</strong></span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div id='features-follow-presentation-followbutton-div-51-m62lwg' className="mt-4 flex justify-end gap-2">
              {dialogMode === "confirm_follow" || dialogMode === "confirm_unfollow" ? (
                <>
                  <Button id='features-follow-presentation-followbutton-button-52-t9qoxu'
                    type="button"
                    variant="ghost"
                    onClick={() => setDialogMode(null)}
                    disabled={isMutating}
                  >
                    إلغاء
                  </Button>
                  <Button id='features-follow-presentation-followbutton-button-53-zgontp'
                    type="button"
                    onClick={runMutation}
                    disabled={isMutating}
                    className="gap-2"
                  >
                    {isMutating ? (
                      <Loader2 id='features-follow-presentation-followbutton-loader2-54-n3gtlu' className="h-4 w-4 animate-spin" />
                    ) : null}
                    {textForDialog.action}
                  </Button>
                </>
              ) : dialogMode === "notify_followers" ? (
                <>
                  <Button id='features-follow-presentation-followbutton-button-55-yyfre4'
                    type="button"
                    variant="ghost"
                    onClick={() => setDialogMode("owner_actions")}
                    disabled={isMutating}
                  >
                    {t("follow.dialog.notification.back")}
                  </Button>
                  <Button id='features-follow-presentation-followbutton-button-56-accnms'
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
                    {isMutating ? <Loader2 id='features-follow-presentation-followbutton-loader2-57-cs0sbr' className="h-4 w-4 animate-spin" /> : <Send id='features-follow-presentation-followbutton-send-58-njxjwv' className="h-4 w-4" />}
                    {textForDialog.action}
                  </Button>
                </>
              ) : (
                <Button id='features-follow-presentation-followbutton-button-59-gf6qsm' type="button" onClick={() => setDialogMode(null)}>
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
