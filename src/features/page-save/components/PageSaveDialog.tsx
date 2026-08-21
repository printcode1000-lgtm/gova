"use client";

import { Loader2, Save } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  closePageSaveDialog,
  executePageSave,
  getPageSaveSnapshot,
  setPageSaveItemSelected,
  subscribePageSave,
} from "@asol/page-save-core";
import { useTranslation } from "@/lib/i18n";

export function PageSaveDialog() {
  const { t } = useTranslation();
  const snapshot = useSyncExternalStore(
    subscribePageSave,
    getPageSaveSnapshot,
    getPageSaveSnapshot,
  );

  const dialog = snapshot.dialog;
  const handleClose = useCallback(() => {
    closePageSaveDialog();
  }, []);

  const handleSave = useCallback(() => {
    void executePageSave();
  }, []);

  if (!snapshot.dialogOpen || !dialog) return null;

  return (
    <Dialog
      open={snapshot.dialogOpen}
      onOpenChange={(next) => {
        if (!next) handleClose();
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
              {dialog.pageLabel}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[min(50vh,20rem)] space-y-2 overflow-y-auto px-6 py-4">
          <p className="text-xs font-semibold text-on-surface-variant">
            {t("pageSave.itemsHeading")}
          </p>
          {dialog.items
            .filter((item) => item.isDirty)
            .map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-3 rounded-2xl border border-outline-variant/40 bg-surface/80 px-3 py-3"
              >
                <Checkbox
                  checked={item.selected}
                  disabled={!item.canSave || dialog.isSaving}
                  onCheckedChange={(checked) => {
                    setPageSaveItemSelected(
                      dialog.registrationId,
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
                  {item.description ? (
                    <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                      {item.description}
                    </span>
                  ) : null}
                  {!item.canSave ? (
                    <span className="mt-1 block text-xs text-error">
                      {t("pageSave.itemBlocked")}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
        </div>

        {dialog.requiresNavigation ? (
          <p className="px-6 text-xs leading-5 text-on-surface-variant">
            {t("pageSave.navigationHint")}
          </p>
        ) : null}

        <DialogFooter className="gap-2 px-6 pb-6 pt-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            size="lg"
            className="w-full rounded-xl"
            disabled={!dialog.canSave || dialog.isSaving}
            onClick={handleSave}
          >
            {dialog.isSaving ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            {dialog.isSaving ? t("pageSave.saving") : t("pageSave.confirmSave")}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="ghost"
            onClick={handleClose}
            className="w-full rounded-xl"
            disabled={dialog.isSaving}
          >
            {t("pageSave.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
