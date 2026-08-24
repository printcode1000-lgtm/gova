"use client";

// `Save` stays the dialog's own hero mark — this is still the page-save dialog.
// The Execute button takes `Check` instead: it now runs the checked work *and*
// permanently discards the unchecked staged operations, so a floppy disk would
// describe half of what it does. A check mark reads as "carry out this
// selection".
import { Check, Save } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { Checkbox } from "@/shared/ui/checkbox";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  acknowledgePageSaveInterruption,
  closePageSaveDialog,
  executePageSave,
  getPageSaveSnapshot,
  setPageSaveItemSelected,
  subscribePageSave,
} from "@asol/page-save-core";
import { reportSystemIssue } from "@asol/system-logs-core";
import { useTranslation } from "@/shared/i18n";

import { describePageSaveItem } from "../application/utils/page-save-operation-description";

export function PageSaveDialog() {
  const { t } = useTranslation();
  const [isExecuting, setIsExecuting] = useState(false);
  const snapshot = useSyncExternalStore(
    subscribePageSave,
    getPageSaveSnapshot,
    getPageSaveSnapshot,
  );

  const dialog = snapshot.dialog;

  useEffect(() => {
    if (!snapshot.dialogOpen) {
      setIsExecuting(false);
    }
  }, [snapshot.dialogOpen]);

  const handleClose = useCallback(() => {
    if (isExecuting || snapshot.isSaving) return;
    closePageSaveDialog();
  }, [isExecuting, snapshot.isSaving]);

  const handleExecute = useCallback(() => {
    if (isExecuting || snapshot.isSaving) return;
    setIsExecuting(true);
    void executePageSave()
      .catch((error) => {
        reportSystemIssue({
          level: "error",
          feature: "PageSave",
          operation: "execute-page-save",
          error,
        });
      })
      .finally(() => {
        setIsExecuting(false);
      });
  }, [isExecuting, snapshot.isSaving]);

  if (!snapshot.dialogOpen) return null;

  const isSaving =
    isExecuting ||
    Boolean(dialog?.isSaving) ||
    snapshot.isSaving ||
    snapshot.phase === "saving";

  return (
    <Dialog
      open={snapshot.dialogOpen}
      onOpenChange={(next) => {
        if (!next && !isSaving) handleClose();
      }}
    >
      <DialogContent className="z-[100] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-[1.75rem] border-primary/20 p-0 shadow-2xl duration-300 data-[state=closed]:zoom-out-50 data-[state=open]:zoom-in-50 [&>button.absolute]:hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background px-6 pb-5 pt-7">
          <div className="absolute -end-12 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/25">
            <Save className="h-8 w-8" aria-hidden="true" />
          </div>
          <DialogHeader className="relative mt-5 text-center sm:text-center">
            <DialogTitle className="text-2xl leading-tight">
              {t("pageSave.dialogTitle")}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-6 text-on-surface-variant">
              {dialog?.pageLabel ?? t("pageSave.interrupted.heading")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[min(50vh,20rem)] space-y-2 overflow-y-auto px-6 py-4">
          {snapshot.interrupted.length > 0 ? (
            <section className="space-y-2 rounded-2xl border border-warning/40 bg-warning/10 p-3">
              <p className="text-xs font-semibold text-on-surface">
                {t("pageSave.interrupted.heading")}
              </p>
              {snapshot.interrupted.map((operation) => (
                <div key={operation.entry.operationId} className="space-y-1">
                  <p className="text-sm font-semibold text-on-surface">
                    {operation.entry.label}
                  </p>
                  <p className="text-xs leading-5 text-on-surface-variant">
                    {operation.verdict === "needsConfirmation"
                      ? t("pageSave.interrupted.needsConfirmation")
                      : t("pageSave.interrupted.failed")}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() =>
                      acknowledgePageSaveInterruption(operation.entry.operationId)
                    }
                  >
                    {t("pageSave.interrupted.acknowledge")}
                  </Button>
                </div>
              ))}
            </section>
          ) : null}
          {dialog ? (
            <p className="text-xs font-semibold text-on-surface-variant">
              {t("pageSave.itemsHeading")}
            </p>
          ) : null}
          {(dialog?.items ?? [])
            .filter((item) => item.isDirty)
            .map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-3 rounded-2xl border border-outline-variant/40 bg-surface/80 px-3 py-3"
              >
                <Checkbox
                  checked={item.ephemeral ? item.selected : true}
                  disabled={!item.ephemeral || !item.canSave || isSaving}
                  aria-disabled={!item.ephemeral || !item.canSave || isSaving}
                  onCheckedChange={(checked) => {
                    if (!item.ephemeral) return;
                    setPageSaveItemSelected(
                      dialog!.registrationId,
                      item.id,
                      checked === true,
                    );
                  }}
                  aria-label={item.label}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-on-surface">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                    {describePageSaveItem(t, item)}
                  </span>
                  {!item.canSave ? (
                    <span className="mt-1 block text-xs text-error">
                      {t("pageSave.itemBlocked")}
                    </span>
                  ) : null}
                  {!item.ephemeral ? (
                    <span className="mt-1 block text-xs text-on-surface-variant">
                      {t("pageSave.itemAlwaysIncluded")}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
        </div>

        {dialog?.requiresNavigation ? (
          <p className="px-6 text-xs leading-5 text-on-surface-variant">
            {t("pageSave.navigationHint")}
          </p>
        ) : null}

        {isSaving ? (
          <p className="px-6 pb-2 text-center text-xs font-medium text-on-surface-variant">
            {t("pageSave.saving")}
          </p>
        ) : snapshot.lastResult === "failure" ? (
          <p
            role="alert"
            className="px-6 pb-2 text-center text-xs font-medium text-error"
          >
            {t("pageSave.failure")}
          </p>
        ) : null}

        <DialogFooter className="flex-row flex-nowrap gap-2 px-6 pb-6 pt-2 sm:flex-row sm:space-x-0">
          <Button
            type="button"
            size="lg"
            className="min-w-0 flex-1 rounded-xl"
            disabled={!dialog?.canSave || isSaving}
            onClick={handleExecute}
          >
            <Check className="me-2 h-4 w-4" />
            {isSaving ? t("pageSave.saving") : t("pageSave.confirmSave")}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="ghost"
            onClick={handleClose}
            className="min-w-0 flex-1 rounded-xl"
            disabled={isSaving}
          >
            {t("pageSave.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
