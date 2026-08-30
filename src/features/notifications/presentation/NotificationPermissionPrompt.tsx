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
      <DialogContent id="notifications.notification-permission-prompt.dialog-content" className="z-[100] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-[1.75rem] border-primary/20 p-0 shadow-2xl duration-300 data-[state=closed]:zoom-out-50 data-[state=open]:zoom-in-50">
        <div id="notifications.notification-permission-prompt.div" className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background px-6 pb-5 pt-7">
          <div id="notifications.notification-permission-prompt.div.2" className="absolute -end-12 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div id="notifications.notification-permission-prompt.div.3" className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/25">
            <BellRing id="notifications.notification-permission-prompt.bell-ring" className="h-8 w-8" aria-hidden="true" />
          </div>
          <DialogHeader id="notifications.notification-permission-prompt.dialog-header" className="relative mt-5 text-center sm:text-center">
            <DialogTitle id="notifications.notification-permission-prompt.dialog-title" className="text-2xl leading-tight">
              {t("notifications.permissionPrompt.title")}
            </DialogTitle>
            <DialogDescription id="notifications.notification-permission-prompt.dialog-description" className="pt-2 text-sm leading-6 text-on-surface-variant">
              {t("notifications.permissionPrompt.description")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div id="notifications.notification-permission-prompt.div.4" className="space-y-3 px-6">
          <div id="notifications.notification-permission-prompt.div.5" className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3">
            <PackageCheck id="notifications.notification-permission-prompt.package-check" className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span id="notifications.notification-permission-prompt.span" className="text-sm text-on-surface">
              {t("notifications.permissionPrompt.orders")}
            </span>
          </div>
          <div id="notifications.notification-permission-prompt.div.6" className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3">
            <MessageCircleMore id="notifications.notification-permission-prompt.message-circle-more" className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span id="notifications.notification-permission-prompt.span.2" className="text-sm text-on-surface">
              {t("notifications.permissionPrompt.messages")}
            </span>
          </div>
          <div id="notifications.notification-permission-prompt.div.7" className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3">
            <ShieldCheck id="notifications.notification-permission-prompt.shield-check" className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span id="notifications.notification-permission-prompt.span.3" className="text-sm text-on-surface">
              {t("notifications.permissionPrompt.control")}
            </span>
          </div>

          {permissionDenied ? (
            <p id="notifications.notification-permission-prompt.p" className="rounded-xl bg-warning/15 px-3 py-2 text-sm text-on-surface" role="status">
              {t(
                canOpenSettings
                  ? "notifications.permissionPrompt.denied"
                  : "notifications.permissionPrompt.deniedManual",
              )}
            </p>
          ) : null}
          {failed ? (
            <p id="notifications.notification-permission-prompt.p.2" className="rounded-xl bg-error/15 px-3 py-2 text-sm text-error" role="alert">
              {t("notifications.permissionPrompt.failed")}
            </p>
          ) : null}
        </div>

        <DialogFooter id="notifications.notification-permission-prompt.dialog-footer" className="gap-2 px-6 pb-6 pt-2 sm:flex-col sm:space-x-0">
          <Button id="notifications.notification-permission-prompt.button"
            type="button"
            size="lg"
            disabled={busy}
            onClick={onPrimary}
            className="w-full rounded-xl"
          >
            {busy ? (
              <Loader2 id="notifications.notification-permission-prompt.loader2" className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : opensSettings ? (
              <Settings2 id="notifications.notification-permission-prompt.settings2" className="me-2 h-4 w-4" aria-hidden="true" />
            ) : rechecks ? (
              <RefreshCw id="notifications.notification-permission-prompt.refresh-cw" className="me-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <BellRing id="notifications.notification-permission-prompt.bell-ring.2" className="me-2 h-4 w-4" aria-hidden="true" />
            )}
            {t(
              opensSettings
                ? "notifications.permissionPrompt.openSettings"
                : rechecks
                  ? "notifications.permissionPrompt.recheck"
                  : "notifications.permissionPrompt.enable",
            )}
          </Button>
          <Button id="notifications.notification-permission-prompt.button.2"
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
