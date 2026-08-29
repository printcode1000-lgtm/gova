"use client";

import { Check, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import {
  createUiSubpartInstanceId,
  uiAttributes,
  type UiDescriptor,
} from "@asol/ui-registry-core";
import {
  acknowledgePageSaveResult,
  getPageSaveSnapshot,
  openPageSaveDialog,
  subscribePageSave,
} from "@asol/page-save-core";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/utils";

import { PageSaveDialog } from "./PageSaveDialog";

const SUCCESS_FLASH_MS = 1800;

interface PageSaveHeaderControlProps {
  ui: UiDescriptor;
  isDirty: boolean;
  hasPersistedPending: boolean;
  isSaving: boolean;
  successFlash: boolean;
  ariaLabel: string;
  onOpen: () => void;
}

/**
 * Generic visual control. Its root identity belongs to each caller usage site;
 * fixed internal subparts are runtime-scoped from that caller identity.
 */
function PageSaveHeaderControl({
  ui,
  isDirty,
  hasPersistedPending,
  isSaving,
  successFlash,
  ariaLabel,
  onOpen,
}: PageSaveHeaderControlProps) {
  return (
    <button
      {...uiAttributes(ui)}
      type="button"
      id="header-page-save-button"
      onClick={onOpen}
      disabled={isSaving || successFlash}
      aria-label={ariaLabel}
      className={cn(
        "asol-control-icon relative flex items-center justify-center rounded-full transition-all duration-200",
        successFlash
          ? "bg-success-container text-on-success-container shadow-sm ring-1 ring-success/25"
          : isSaving
            ? "bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary/20"
            : "bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary/20",
      )}
    >
      {(isDirty || hasPersistedPending) && !isSaving && !successFlash ? (
        <>
          <span
            {...uiAttributes({
              uid: "page-save.page-save-header-button.span.3-9qLHB1",
              id: "page-save.page-save-header-button.span.3",
              instance: createUiSubpartInstanceId(ui.uid, ui.instance, "dirty-wave"),
            })}
            id="page-save.page-save-header-button.span"
            aria-hidden="true"
            className="asol-page-save-wave pointer-events-none absolute inset-0 rounded-full"
          />
          <span
            {...uiAttributes({
              uid: "page-save.page-save-header-button.span.4-ilDY2h",
              id: "page-save.page-save-header-button.span.4",
              instance: createUiSubpartInstanceId(ui.uid, ui.instance, "dirty-wave-delayed"),
            })}
            id="page-save.page-save-header-button.span.2"
            aria-hidden="true"
            className="asol-page-save-wave asol-page-save-wave--delayed pointer-events-none absolute inset-0 rounded-full"
          />
        </>
      ) : null}
      {successFlash ? (
        <Check
          id="page-save.page-save-header-button.check"
          className="relative z-10 h-5 w-5"
          aria-hidden="true"
        />
      ) : isSaving ? (
        <LoadingSpinner
          ui={{
            uid: "page-save.page-save-header-button.loading-spinner.2-OgGq92",
            id: "page-save.page-save-header-button.loading-spinner.2",
            instance: createUiSubpartInstanceId(ui.uid, ui.instance, "spinner"),
          }}
          id="page-save.page-save-header-button.loading-spinner"
          size="sm"
          className="relative z-10"
        />
      ) : (
        <Save
          id="page-save.page-save-header-button.save"
          className="relative z-10 h-5 w-5"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

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

  const ariaLabel = successFlash
    ? t("pageSave.success")
    : isSaving
      ? t("pageSave.saving")
      : snapshot.label
        ? `${t("pageSave.save")}: ${snapshot.label}`
        : t("pageSave.save");

  const controlProps = {
    isDirty: snapshot.isDirty,
    hasPersistedPending: snapshot.hasPersistedPending,
    isSaving,
    successFlash,
    ariaLabel,
    onOpen: handleOpen,
  } as const;

  const registrationId = snapshot.registrationId ?? null;
  const control =
    registrationId === "profile-edit" ? (
      <PageSaveHeaderControl
        ui={{
          uid: "profile-save-Pwo7A2",
          id: "profile-save",
          kind: "action",
          action: "open-page-save",
          part: "save",
          interaction: { type: "tap" },
          simulation: { kind: "event", id: "profile-save" },
        }}
        {...controlProps}
      />
    ) : registrationId === "pharmacy-catalog-manager" ? (
      <PageSaveHeaderControl
        ui={{
          uid: "pharmacy-save-wk68NN",
          id: "pharmacy-save",
          kind: "action",
          action: "open-page-save",
          part: "save",
          interaction: { type: "tap" },
          simulation: { kind: "event", id: "pharmacy-save" },
        }}
        {...controlProps}
      />
    ) : registrationId === "custom-request" ? (
      <PageSaveHeaderControl
        ui={{
          uid: "custom-request-submit-IyKED5",
          id: "custom-request-submit",
          kind: "action",
          action: "open-page-save",
          part: "save",
          interaction: { type: "tap" },
          simulation: { kind: "event", id: "custom-request-submit" },
        }}
        {...controlProps}
      />
    ) : registrationId === null ? (
      <PageSaveHeaderControl
        ui={{
          uid: "app.header.page-save-pN948A",
          id: "app.header.page-save",
          kind: "action",
          action: "open-page-save",
          part: "save",
        }}
        {...controlProps}
      />
    ) : (
      <PageSaveHeaderControl
        ui={{
          uid: "page-save.page-save-header-button.button-7dyU83",
          id: "page-save.page-save-header-button.button",
          kind: "action",
          action: "open-page-save",
          part: "save",
        }}
        {...controlProps}
      />
    );

  return (
    <>
      {control}
      <PageSaveDialog />
    </>
  );
}
