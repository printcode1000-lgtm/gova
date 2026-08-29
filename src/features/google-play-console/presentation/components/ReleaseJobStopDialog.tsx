"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type { BuildJobRecord } from "@asol/release-core/console";
import { uiAttributes } from "@asol/ui-registry-core";

/**
 * Confirmation shown before a running job is killed. Stopping mid-build can
 * leave partial output behind, so it is never a single click.
 */
export function ReleaseJobStopDialog({ id, job, t, onConfirm, onCancel }: {
  job: BuildJobRecord | null;
  t: (key: string) => string;
  onConfirm: () => void;
  onCancel: () => void;
} & { id?: string }) {
  return (
    <Dialog open={Boolean(job)} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent
        id={id}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
      >
        <DialogHeader ui={{ uid: "google-play-console.release-job-stop-dialog.dialog-header-fE2x3g", id: "google-play-console.release-job-stop-dialog.dialog-header" }}>
          <DialogTitle ui={{ uid: "google-play-console.release-job-stop-dialog.dialog-title-zt3w5X", id: "google-play-console.release-job-stop-dialog.dialog-title" }}>{t("releaseConsole.stopConfirm.title")}</DialogTitle>
          <DialogDescription ui={{ uid: "google-play-console.release-job-stop-dialog.dialog-description-1EG9IT", id: "google-play-console.release-job-stop-dialog.dialog-description" }}>{t("releaseConsole.stopConfirm.body")}</DialogDescription>
        </DialogHeader>
        <div {...uiAttributes({ uid: "google-play-console.release-job-stop-dialog.div-P6VklZ", id: "google-play-console.release-job-stop-dialog.div" })} className="space-y-2 text-sm">
          <code {...uiAttributes({ uid: "google-play-console.release-job-stop-dialog.code-xwMj2j", id: "google-play-console.release-job-stop-dialog.code" })} className="block text-xs" dir="ltr">npm run {job?.command.script}</code>
          <code {...uiAttributes({ uid: "google-play-console.release-job-stop-dialog.code.2-fBAe2w", id: "google-play-console.release-job-stop-dialog.code.2" })} className="block text-xs" dir="ltr">{job?.id}</code>
          <p {...uiAttributes({ uid: "google-play-console.release-job-stop-dialog.p-06LhED", id: "google-play-console.release-job-stop-dialog.p" })} className="flex items-center gap-2 rounded-md bg-error-container p-2 text-on-error-container">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("releaseConsole.stopConfirm.warning")}
          </p>
        </div>
        <DialogFooter ui={{ uid: "google-play-console.release-job-stop-dialog.dialog-footer-G4EKVY", id: "google-play-console.release-job-stop-dialog.dialog-footer" }}>
          <Button
            ui={{
              uid: "release-console.stop-dialog.keep-running-y6nJkK",
              id: "release-console.stop-dialog.keep-running",
              kind: "action",
              action: "keep-running",
              part: "footer",
            }} variant="outline" onClick={onCancel}>
            {t("releaseConsole.stopConfirm.keepRunning")}
          </Button>
          <Button
            ui={{
              uid: "release-console.stop-dialog.confirm-stop-XSB1wn",
              id: "release-console.stop-dialog.confirm-stop",
              kind: "action",
              action: "confirm-stop",
              part: "footer",
            }} variant="destructive" onClick={onConfirm}>
            {t("releaseConsole.stopConfirm.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
