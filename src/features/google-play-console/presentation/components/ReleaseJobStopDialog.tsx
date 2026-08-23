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

/**
 * Confirmation shown before a running job is killed. Stopping mid-build can
 * leave partial output behind, so it is never a single click.
 */
export function ReleaseJobStopDialog({ job, t, onConfirm, onCancel }: {
  job: BuildJobRecord | null;
  t: (key: string) => string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={Boolean(job)} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("releaseConsole.stopConfirm.title")}</DialogTitle>
          <DialogDescription>{t("releaseConsole.stopConfirm.body")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <code className="block text-xs" dir="ltr">npm run {job?.command.script}</code>
          <code className="block text-xs" dir="ltr">{job?.id}</code>
          <p className="flex items-center gap-2 rounded-md bg-error-container p-2 text-on-error-container">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("releaseConsole.stopConfirm.warning")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("releaseConsole.stopConfirm.keepRunning")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("releaseConsole.stopConfirm.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
