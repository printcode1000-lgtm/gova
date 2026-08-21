"use client";

import { Loader2, Save } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

import {
  getPageSaveSnapshot,
  openPageSaveDialog,
  subscribePageSave,
} from "@asol/page-save-core";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { PageSaveDialog } from "./PageSaveDialog";

export function PageSaveHeaderButton() {
  const { t } = useTranslation();
  const snapshot = useSyncExternalStore(
    subscribePageSave,
    getPageSaveSnapshot,
    getPageSaveSnapshot,
  );

  const visible =
    snapshot.isDirty || snapshot.isSaving || snapshot.hasPersistedPending;

  const handleOpen = useCallback(() => {
    openPageSaveDialog();
  }, []);

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        id="header-page-save-button"
        onClick={handleOpen}
        disabled={snapshot.isSaving}
        aria-label={
          snapshot.isSaving
            ? t("pageSave.saving")
            : snapshot.label
              ? `${t("pageSave.save")}: ${snapshot.label}`
              : t("pageSave.save")
        }
        className={cn(
          "asol-control-icon relative flex items-center justify-center rounded-full transition-all duration-200",
          snapshot.isSaving
            ? "text-on-surface-variant opacity-70"
            : "bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary/20",
        )}
      >
        {(snapshot.isDirty || snapshot.hasPersistedPending) && !snapshot.isSaving ? (
          <>
            <span
              aria-hidden="true"
              className="asol-page-save-wave pointer-events-none absolute inset-0 rounded-full"
            />
            <span
              aria-hidden="true"
              className="asol-page-save-wave asol-page-save-wave--delayed pointer-events-none absolute inset-0 rounded-full"
            />
          </>
        ) : null}
        {snapshot.isSaving ? (
          <Loader2 className="relative z-10 h-5 w-5 animate-spin" />
        ) : (
          <Save className="relative z-10 h-5 w-5" />
        )}
      </button>
      <PageSaveDialog />
    </>
  );
}
