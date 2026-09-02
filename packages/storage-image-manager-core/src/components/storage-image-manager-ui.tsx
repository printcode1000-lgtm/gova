"use client";

import * as React from "react";

import type { DialogState, StorageImageAspectRatio } from "./storage-image-manager.types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function defaultTranslate(
  key: string,
  values?: Record<string, string | number>,
) {
  if (!values) return key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    key,
  );
}

export function InlineLoadingSpinner({
  size = "md",
}: {
  size?: "sm" | "md";
}) {
  return (
    <span id="storage-image-manager-core-src-components-storage-image-manager-ui-text-1-yqjcnr"
      aria-hidden="true"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-e-transparent",
        size === "sm" ? "h-4 w-4" : "h-6 w-6",
      )}
    />
  );
}

export function ManagerButton({
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "icon";
}) {
  return (
    <button id="storage-image-manager-core-src-components-storage-image-manager-ui-button-2-gpgvgr"
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50",
        variant === "primary" && "bg-primary px-4 py-2 text-primary-foreground",
        variant === "secondary" &&
          "bg-secondary px-4 py-2 text-secondary-foreground",
        variant === "icon" && "h-9 w-9 p-0",
        props.disabled && "disabled:cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}

export const aspectClasses: Record<StorageImageAspectRatio, string> = {
  square: "aspect-square",
  landscape: "aspect-video",
  portrait: "aspect-[3/4]",
  wide: "aspect-[21/9]",
};

export function StorageImageSlotFrame({
  children,
  aspectRatio,
  id,
}: {
  children: React.ReactNode;
  aspectRatio: StorageImageAspectRatio;
  id?: string;
}) {
  return (
    <div id="storage-image-manager-core-src-components-storage-image-manager-ui-div-3-wjc7q4" className="w-full min-w-0 overflow-hidden rounded-lg border-2 border-primary/20 bg-primary/5 p-0.5">
      <div id="storage-image-manager-core-src-components-storage-image-manager-ui-div-4-aeh2ai"
        className={cn(
          "relative w-full min-w-0 overflow-hidden",
          aspectClasses[aspectRatio],
        )}
      >
        {children}
      </div>
    </div>
  );
}

export const storageImageSlotSurfaceClasses =
  "relative h-full w-full min-w-0 overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200";

export const storageImageEmptyStateClasses =
  "absolute inset-0 flex min-h-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg px-1.5 py-1";

export const storageImageEmptyStateIconClasses =
  "shrink-0 rounded-full bg-muted p-1.5";

export const storageImageEmptyStateLabelClasses =
  "max-w-full text-center text-xs font-medium leading-tight text-primary transition [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60";

export const storageImageEmptyStateProgressClasses =
  "max-w-full text-center text-xs font-medium leading-tight text-primary [overflow-wrap:anywhere]";

export function StorageManagerDialog({
  state,
  onClose,
  confirmLabel,
  cancelLabel,
  closeLabel,
}: {
  state: DialogState;
  onClose: () => void;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
}) {
  if (!state) return null;

  return (
    <div id="storage-image-manager-core-src-components-storage-image-manager-ui-div-5-7utmx6"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
    >
      <div id="storage-image-manager-core-src-components-storage-image-manager-ui-div-6-hhmgas"
        className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby='storage-image-manager-core-src-components-storage-image-manager-ui-heading-7-2c95j8'
      >
        <h2 id='storage-image-manager-core-src-components-storage-image-manager-ui-heading-7-2c95j8' className="text-lg font-semibold">
          {state.title}
        </h2>
        <p id="storage-image-manager-core-src-components-storage-image-manager-ui-text-8-jhz8ge" className="mt-2 text-sm text-muted-foreground">{state.message}</p>
        <div id="storage-image-manager-core-src-components-storage-image-manager-ui-div-9-jiejna" className="mt-5 flex justify-end gap-2">
          {state.kind !== "error" ? (
            <>
              <ManagerButton type="button" variant="secondary" onClick={onClose}>
                {cancelLabel}
              </ManagerButton>
              <ManagerButton
                type="button"
                onClick={() => {
                  const action = state.onConfirm;
                  onClose();
                  action();
                }}
              >
                {state.actionLabel ?? confirmLabel}
              </ManagerButton>
            </>
          ) : (
            <ManagerButton type="button" onClick={onClose}>
              {closeLabel}
            </ManagerButton>
          )}
        </div>
      </div>
    </div>
  );
}
