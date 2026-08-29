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
import { uiAttributes } from "@asol/ui-registry-core";
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
      <DialogContent {...uiAttributes({ uid: "page-save.dialog-CfGhr4", id: "page-save.dialog", kind: "region", part: "dialog" })} className="z-[100] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-[1.75rem] border-primary/20 p-0 shadow-2xl duration-300 data-[state=closed]:zoom-out-50 data-[state=open]:zoom-in-50 [&>button.absolute]:hidden">
        <div {...uiAttributes({ uid: "page-save.page-save-dialog.div.5-r062Ah", id: "page-save.page-save-dialog.div.5" })} id="page-save.page-save-dialog.div" className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background px-6 pb-5 pt-7">
          <div {...uiAttributes({ uid: "page-save.page-save-dialog.div.6-wbF2tT", id: "page-save.page-save-dialog.div.6" })} id="page-save.page-save-dialog.div.2" className="absolute -end-12 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div {...uiAttributes({ uid: "page-save.page-save-dialog.div.7-lhaIh6", id: "page-save.page-save-dialog.div.7" })} id="page-save.page-save-dialog.div.3" className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/25">
            <Save id="page-save.page-save-dialog.save" className="h-8 w-8" aria-hidden="true" />
          </div>
          <DialogHeader id="page-save.page-save-dialog.dialog-header" className="relative mt-5 text-center sm:text-center">
            <DialogTitle id="page-save.page-save-dialog.dialog-title" className="text-2xl leading-tight">
              {t("pageSave.dialogTitle")}
            </DialogTitle>
            <DialogDescription id="page-save.page-save-dialog.dialog-description" className="pt-2 text-sm leading-6 text-on-surface-variant">
              {dialog?.pageLabel ?? t("pageSave.interrupted.heading")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div {...uiAttributes({ uid: "page-save.page-save-dialog.div.8-6JjAiJ", id: "page-save.page-save-dialog.div.8" })} id="page-save.page-save-dialog.div.4" className="max-h-[min(50vh,20rem)] space-y-2 overflow-y-auto px-6 py-4">
          {snapshot.interrupted.length > 0 ? (
            <section {...uiAttributes({ uid: "page-save.page-save-dialog.section.2-Ui2AZi", id: "page-save.page-save-dialog.section.2" })} id="page-save.page-save-dialog.section" className="space-y-2 rounded-2xl border border-warning/40 bg-warning/10 p-3">
              <p {...uiAttributes({ uid: "page-save.page-save-dialog.p.6-qCbA4p", id: "page-save.page-save-dialog.p.6" })} id="page-save.page-save-dialog.p" className="text-xs font-semibold text-on-surface">
                {t("pageSave.interrupted.heading")}
              </p>
              {snapshot.interrupted.map((operation) => (
                <div key={operation.entry.operationId} {...uiAttributes({ uid: "page-save.page-save-dialog.div.9-Y59HBL", id: "page-save.page-save-dialog.div.9" })} className="space-y-1">
                  <p {...uiAttributes({ uid: "page-save.page-save-dialog.p.7-c09GY3", id: "page-save.page-save-dialog.p.7" })} className="text-sm font-semibold text-on-surface">
                    {operation.entry.label}
                  </p>
                  <p {...uiAttributes({ uid: "page-save.page-save-dialog.p.8-TZ2Ygo", id: "page-save.page-save-dialog.p.8" })} className="text-xs leading-5 text-on-surface-variant">
                    {operation.verdict === "needsConfirmation"
                      ? t("pageSave.interrupted.needsConfirmation")
                      : t("pageSave.interrupted.failed")}
                  </p>
                  <Button ui={{ uid: "page-save.page-save-dialog.button.3-Jj9FDm", id: "page-save.page-save-dialog.button.3" }}
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
            <p {...uiAttributes({ uid: "page-save.page-save-dialog.p.9-RXfK22", id: "page-save.page-save-dialog.p.9" })} id="page-save.page-save-dialog.p.2" className="text-xs font-semibold text-on-surface-variant">
              {t("pageSave.itemsHeading")}
            </p>
          ) : null}
          {(dialog?.items ?? [])
            .filter((item) => item.isDirty)
            .map((item) => (
              <label
                key={item.id} {...uiAttributes({ uid: "page-save.page-save-dialog.label-HAVkb2", id: "page-save.page-save-dialog.label" })}
                className="flex items-start gap-3 rounded-2xl border border-outline-variant/40 bg-surface/80 px-3 py-3"
              >
                <Checkbox ui={{ uid: "page-save.page-save-dialog.checkbox-gY0XbA", id: "page-save.page-save-dialog.checkbox" }}
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
                <span {...uiAttributes({ uid: "page-save.page-save-dialog.span-ASb680", id: "page-save.page-save-dialog.span" })} className="min-w-0 flex-1">
                  <span {...uiAttributes({ uid: "page-save.page-save-dialog.span.2-DbWZE3", id: "page-save.page-save-dialog.span.2" })} className="block text-sm font-semibold text-on-surface">
                    {item.label}
                  </span>
                  <span {...uiAttributes({ uid: "page-save.page-save-dialog.span.3-kU4eDQ", id: "page-save.page-save-dialog.span.3" })} className="mt-1 block text-xs leading-5 text-on-surface-variant">
                    {describePageSaveItem(t, item)}
                  </span>
                  {!item.canSave ? (
                    <span {...uiAttributes({ uid: "page-save.page-save-dialog.span.4-y4OQM6", id: "page-save.page-save-dialog.span.4" })} className="mt-1 block text-xs text-error">
                      {t("pageSave.itemBlocked")}
                    </span>
                  ) : null}
                  {!item.ephemeral ? (
                    <span {...uiAttributes({ uid: "page-save.page-save-dialog.span.5-DE7KRb", id: "page-save.page-save-dialog.span.5" })} className="mt-1 block text-xs text-on-surface-variant">
                      {t("pageSave.itemAlwaysIncluded")}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
        </div>

        {dialog?.requiresNavigation ? (
          <p {...uiAttributes({ uid: "page-save.page-save-dialog.p.10-J8KxUp", id: "page-save.page-save-dialog.p.10" })} id="page-save.page-save-dialog.p.3" className="px-6 text-xs leading-5 text-on-surface-variant">
            {t("pageSave.navigationHint")}
          </p>
        ) : null}

        {isSaving ? (
          <p {...uiAttributes({ uid: "page-save.page-save-dialog.p.11-onJv7g", id: "page-save.page-save-dialog.p.11" })} id="page-save.page-save-dialog.p.4" className="px-6 pb-2 text-center text-xs font-medium text-on-surface-variant">
            {t("pageSave.saving")}
          </p>
        ) : snapshot.lastResult === "failure" ? (
          <p {...uiAttributes({ uid: "page-save.page-save-dialog.p.12-ZN85u5", id: "page-save.page-save-dialog.p.12" })} id="page-save.page-save-dialog.p.5"
            role="alert"
            className="px-6 pb-2 text-center text-xs font-medium text-error"
          >
            {t("pageSave.failure")}
          </p>
        ) : null}

        <DialogFooter id="page-save.page-save-dialog.dialog-footer" className="flex-row flex-nowrap gap-2 px-6 pb-6 pt-2 sm:flex-row sm:space-x-0">
          <Button id="page-save.page-save-dialog.button"
            type="button"
            size="lg"
            ui={{
              uid: "page-save.dialog.execute-Ox5spc",
              id: "page-save.dialog.execute",
              kind: "action",
              action: "execute",
              part: "confirm",
              interaction: { type: "tap" }, simulation: { kind: "event", id: "page-save-execute" },
            }}
            className="min-w-0 flex-1 rounded-xl"
            disabled={!dialog?.canSave || isSaving}
            onClick={handleExecute}
          >
            <Check id="page-save.page-save-dialog.check" className="me-2 h-4 w-4" />
            {isSaving ? t("pageSave.saving") : t("pageSave.confirmSave")}
          </Button>
          <Button id="page-save.page-save-dialog.button.2"
            type="button"
            size="lg"
            variant="ghost"
            ui={{ uid: "page-save.dialog.close-TDE6xt", id: "page-save.dialog.close", kind: "action", action: "close", part: "cancel" }}
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
