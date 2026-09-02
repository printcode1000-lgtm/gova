"use client";

import {
  BellRing,
  Loader2,
  MessageCircleMore,
  PackageCheck,
  RefreshCw,
  Settings2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useTranslation } from "@/shared/i18n";
import type { NotificationPromptAction } from "../application/notification-permission-prompt-policy";

interface NotificationPermissionPromptProps {
  open: boolean;
  action: NotificationPromptAction;
  busy: boolean;
  failed: boolean;
  permissionDenied: boolean;
  /**
   * Whether the platform can open its own settings screen — the Android shell
   * only. Elsewhere a blocked permission can be undone by the user alone, so
   * the dialog says so and offers a re-check instead of a dead button.
   */
  canOpenSettings: boolean;
  onPrimary: () => void;
  onLater: () => void;
}

export function NotificationPermissionPrompt({
  open,
  action,
  busy,
  failed,
  permissionDenied,
  canOpenSettings,
  onPrimary,
  onLater,
}: NotificationPermissionPromptProps) {
  const { t } = useTranslation();
  const blocked = action === "open-settings";
  const opensSettings = blocked && canOpenSettings;
  const rechecks = blocked && !canOpenSettings;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onLater()}>
      <DialogContent id='features-notifications-presentation-notificationpermissionprompt-dialogcontent-1-tkawhd' className="z-[100] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-[1.75rem] border-primary/20 p-0 shadow-2xl duration-300 data-[state=closed]:zoom-out-50 data-[state=open]:zoom-in-50">
        <div id='features-notifications-presentation-notificationpermissionprompt-div-2-yztrrc' className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background px-6 pb-5 pt-7">
          <div id='features-notifications-presentation-notificationpermissionprompt-div-3-pahkgb' className="absolute -end-12 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div id='features-notifications-presentation-notificationpermissionprompt-div-4-kxcxq2' className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/25">
            <BellRing id='features-notifications-presentation-notificationpermissionprompt-bellring-5-irfhna' className="h-8 w-8" aria-hidden="true" />
          </div>
          <DialogHeader id='features-notifications-presentation-notificationpermissionprompt-dialogheader-6-eaq78g' className="relative mt-5 text-center sm:text-center">
            <DialogTitle id='features-notifications-presentation-notificationpermissionprompt-dialogtitle-7-01rvut' className="text-2xl leading-tight">
              {t("notifications.permissionPrompt.title")}
            </DialogTitle>
            <DialogDescription id='features-notifications-presentation-notificationpermissionprompt-dialogdescription-8-cikxm7' className="pt-2 text-sm leading-6 text-on-surface-variant">
              {t("notifications.permissionPrompt.description")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div id='features-notifications-presentation-notificationpermissionprompt-div-9-c85wup' className="space-y-3 px-6">
          <div id='features-notifications-presentation-notificationpermissionprompt-div-10-lt1ftz' className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3">
            <PackageCheck id='features-notifications-presentation-notificationpermissionprompt-packagecheck-11-9akphc' className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span id='features-notifications-presentation-notificationpermissionprompt-text-12-dqunil' className="text-sm text-on-surface">
              {t("notifications.permissionPrompt.orders")}
            </span>
          </div>
          <div id='features-notifications-presentation-notificationpermissionprompt-div-13-s2swo7' className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3">
            <MessageCircleMore id='features-notifications-presentation-notificationpermissionprompt-messagecirclemore-14-tjizhe' className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span id='features-notifications-presentation-notificationpermissionprompt-text-15-acxjqb' className="text-sm text-on-surface">
              {t("notifications.permissionPrompt.messages")}
            </span>
          </div>
          <div id='features-notifications-presentation-notificationpermissionprompt-div-16-xpgrpb' className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3">
            <ShieldCheck id='features-notifications-presentation-notificationpermissionprompt-shieldcheck-17-zdiclm' className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span id='features-notifications-presentation-notificationpermissionprompt-text-18-vexslc' className="text-sm text-on-surface">
              {t("notifications.permissionPrompt.control")}
            </span>
          </div>

          {permissionDenied ? (
            <p id='features-notifications-presentation-notificationpermissionprompt-text-19-yktayn' className="rounded-xl bg-warning/15 px-3 py-2 text-sm text-on-surface" role="status">
              {t(
                canOpenSettings
                  ? "notifications.permissionPrompt.denied"
                  : "notifications.permissionPrompt.deniedManual",
              )}
            </p>
          ) : null}
          {failed ? (
            <p id='features-notifications-presentation-notificationpermissionprompt-text-20-yhphnq' className="rounded-xl bg-error/15 px-3 py-2 text-sm text-error" role="alert">
              {t("notifications.permissionPrompt.failed")}
            </p>
          ) : null}
        </div>

        <DialogFooter id='features-notifications-presentation-notificationpermissionprompt-dialogfooter-21-pxqpi8' className="gap-2 px-6 pb-6 pt-2 sm:flex-col sm:space-x-0">
          <Button id='features-notifications-presentation-notificationpermissionprompt-button-22-5xi9yx'
            type="button"
            size="lg"
            disabled={busy}
            onClick={onPrimary}
            className="w-full rounded-xl"
          >
            {busy ? (
              <Loader2 id='features-notifications-presentation-notificationpermissionprompt-loader2-23-dip4zh' className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : opensSettings ? (
              <Settings2 id='features-notifications-presentation-notificationpermissionprompt-settings2-24-jdh15z' className="me-2 h-4 w-4" aria-hidden="true" />
            ) : rechecks ? (
              <RefreshCw id='features-notifications-presentation-notificationpermissionprompt-refreshcw-25-un1owo' className="me-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <BellRing id='features-notifications-presentation-notificationpermissionprompt-bellring-26-t5iflj' className="me-2 h-4 w-4" aria-hidden="true" />
            )}
            {t(
              opensSettings
                ? "notifications.permissionPrompt.openSettings"
                : rechecks
                  ? "notifications.permissionPrompt.recheck"
                  : "notifications.permissionPrompt.enable",
            )}
          </Button>
          <Button id='features-notifications-presentation-notificationpermissionprompt-button-27-qfudpq'
            type="button"
            size="lg"
            variant="ghost"
            disabled={busy}
            onClick={onLater}
            className="w-full rounded-xl"
          >
            {t("notifications.permissionPrompt.later")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
