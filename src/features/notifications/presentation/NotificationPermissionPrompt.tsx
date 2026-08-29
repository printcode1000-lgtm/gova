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
import { uiAttributes } from "@asol/ui-registry-core";

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
        <div {...uiAttributes({ uid: "notifications.notification-permission-prompt.div.8-MUK6di", id: "notifications.notification-permission-prompt.div.8" })} id="notifications.notification-permission-prompt.div" className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background px-6 pb-5 pt-7">
          <div {...uiAttributes({ uid: "notifications.notification-permission-prompt.div.9-6rz5YR", id: "notifications.notification-permission-prompt.div.9" })} id="notifications.notification-permission-prompt.div.2" className="absolute -end-12 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div {...uiAttributes({ uid: "notifications.notification-permission-prompt.div.10-DUBb9h", id: "notifications.notification-permission-prompt.div.10" })} id="notifications.notification-permission-prompt.div.3" className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/25">
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

        <div {...uiAttributes({ uid: "notifications.notification-permission-prompt.div.11-y1EH1H", id: "notifications.notification-permission-prompt.div.11" })} id="notifications.notification-permission-prompt.div.4" className="space-y-3 px-6">
          <div {...uiAttributes({ uid: "notifications.notification-permission-prompt.div.12-Y0BJrg", id: "notifications.notification-permission-prompt.div.12" })} id="notifications.notification-permission-prompt.div.5" className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3">
            <PackageCheck id="notifications.notification-permission-prompt.package-check" className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span {...uiAttributes({ uid: "notifications.notification-permission-prompt.span.4-u2XIGN", id: "notifications.notification-permission-prompt.span.4" })} id="notifications.notification-permission-prompt.span" className="text-sm text-on-surface">
              {t("notifications.permissionPrompt.orders")}
            </span>
          </div>
          <div {...uiAttributes({ uid: "notifications.notification-permission-prompt.div.13-0RzmVV", id: "notifications.notification-permission-prompt.div.13" })} id="notifications.notification-permission-prompt.div.6" className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3">
            <MessageCircleMore id="notifications.notification-permission-prompt.message-circle-more" className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span {...uiAttributes({ uid: "notifications.notification-permission-prompt.span.5-u1EiKX", id: "notifications.notification-permission-prompt.span.5" })} id="notifications.notification-permission-prompt.span.2" className="text-sm text-on-surface">
              {t("notifications.permissionPrompt.messages")}
            </span>
          </div>
          <div {...uiAttributes({ uid: "notifications.notification-permission-prompt.div.14-Q2dgF7", id: "notifications.notification-permission-prompt.div.14" })} id="notifications.notification-permission-prompt.div.7" className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3">
            <ShieldCheck id="notifications.notification-permission-prompt.shield-check" className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span {...uiAttributes({ uid: "notifications.notification-permission-prompt.span.6-p3qr3U", id: "notifications.notification-permission-prompt.span.6" })} id="notifications.notification-permission-prompt.span.3" className="text-sm text-on-surface">
              {t("notifications.permissionPrompt.control")}
            </span>
          </div>

          {permissionDenied ? (
            <p {...uiAttributes({ uid: "notifications.notification-permission-prompt.p.3-P8Xi2v", id: "notifications.notification-permission-prompt.p.3" })} id="notifications.notification-permission-prompt.p" className="rounded-xl bg-warning/15 px-3 py-2 text-sm text-on-surface" role="status">
              {t(
                canOpenSettings
                  ? "notifications.permissionPrompt.denied"
                  : "notifications.permissionPrompt.deniedManual",
              )}
            </p>
          ) : null}
          {failed ? (
            <p {...uiAttributes({ uid: "notifications.notification-permission-prompt.p.4-cM6TGt", id: "notifications.notification-permission-prompt.p.4" })} id="notifications.notification-permission-prompt.p.2" className="rounded-xl bg-error/15 px-3 py-2 text-sm text-error" role="alert">
              {t("notifications.permissionPrompt.failed")}
            </p>
          ) : null}
        </div>

        <DialogFooter id="notifications.notification-permission-prompt.dialog-footer" className="gap-2 px-6 pb-6 pt-2 sm:flex-col sm:space-x-0">
          <Button id="notifications.notification-permission-prompt.button" ui={{ uid: "notifications.permission-prompt.enable-UNg4lD", id: "notifications.permission-prompt.enable", kind: "action", action: "enable-notifications", part: "prompt" }}
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
          <Button id="notifications.notification-permission-prompt.button.2" ui={{ uid: "notifications.permission-prompt.later-eMpgQ6", id: "notifications.permission-prompt.later", kind: "action", action: "dismiss-prompt", part: "prompt" }}
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
