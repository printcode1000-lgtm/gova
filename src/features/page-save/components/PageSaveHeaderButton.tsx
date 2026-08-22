"use client";

import { Check, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  acknowledgePageSaveResult,
  getPageSaveSnapshot,
  openPageSaveDialog,
  subscribePageSave,
} from "@asol/page-save-core";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { PageSaveDialog } from "./PageSaveDialog";

const SUCCESS_FLASH_MS = 1800;

export function PageSaveHeaderButton() {
  const { t } = useTranslation();
  const snapshot = useSyncExternalStore(
    subscribePageSave,
    getPageSaveSnapshot,
    getPageSaveSnapshot,
  );
  const [successFlash, setSuccessFlash] = useState(false);
  const wasSavingRef = useRef(false);

  useEffect(() => {
    if (snapshot.isSaving || snapshot.phase === "saving") {
      wasSavingRef.current = true;
      setSuccessFlash(false);
      return;
    }

    // A save that resolves before React renders the spinner still deserves its
    // confirmation, so the registry's result counts as well as the observed
    // saving phase. Acknowledging clears it so it cannot flash again later.
    const finishedSaving =
      wasSavingRef.current || snapshot.lastResult === "success";
    if (
      finishedSaving &&
      !snapshot.isDirty &&
      !snapshot.hasPersistedPending &&
      snapshot.interrupted.length === 0
    ) {
      wasSavingRef.current = false;
      acknowledgePageSaveResult();
      setSuccessFlash(true);
      return;
    }

    wasSavingRef.current = false;
  }, [
    snapshot.hasPersistedPending,
    snapshot.interrupted.length,
    snapshot.isDirty,
    snapshot.isSaving,
    snapshot.lastResult,
    snapshot.phase,
  ]);

  // The countdown owns only itself: acknowledging the result changes the
  // snapshot, and a timer tied to that effect would be cancelled mid-flash.
  useEffect(() => {
    if (!successFlash) return undefined;
    const timer = window.setTimeout(() => {
      setSuccessFlash(false);
    }, SUCCESS_FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [successFlash]);

  const isSaving = snapshot.isSaving || snapshot.phase === "saving";
  const visible =
    snapshot.isDirty ||
    snapshot.hasPersistedPending ||
    snapshot.interrupted.length > 0 ||
    isSaving ||
    successFlash;

  const handleOpen = useCallback(() => {
    if (isSaving || successFlash) return;
    openPageSaveDialog();
  }, [isSaving, successFlash]);

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        id="header-page-save-button"
        onClick={handleOpen}
        disabled={isSaving || successFlash}
        aria-label={
          successFlash
            ? t("pageSave.success")
            : isSaving
              ? t("pageSave.saving")
              : snapshot.label
                ? `${t("pageSave.save")}: ${snapshot.label}`
                : t("pageSave.save")
        }
        className={cn(
          "asol-control-icon relative flex items-center justify-center rounded-full transition-all duration-200",
          successFlash
            ? "bg-success-container text-on-success-container shadow-sm ring-1 ring-success/25"
            : isSaving
              ? "bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary/20"
              : "bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary/20",
        )}
      >
        {(snapshot.isDirty || snapshot.hasPersistedPending) &&
        !isSaving &&
        !successFlash ? (
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
        {successFlash ? (
          <Check className="relative z-10 h-5 w-5" aria-hidden="true" />
        ) : isSaving ? (
          <LoadingSpinner size="sm" className="relative z-10" />
        ) : (
          <Save className="relative z-10 h-5 w-5" aria-hidden="true" />
        )}
      </button>
      <PageSaveDialog />
    </>
  );
}
