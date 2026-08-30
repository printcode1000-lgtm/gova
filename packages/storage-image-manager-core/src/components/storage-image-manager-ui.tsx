"use client";

import * as React from "react";

import {
  createOpaqueUiInstanceId,
  type UiDescriptor,
  uiAttributes,
} from "@asol/ui-registry-core";
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
    <span {...uiAttributes({ uid: "packages.storage-image-manager-core.storage-image-manager-ui.span-YiH50X", id: "packages.storage-image-manager-core.storage-image-manager-ui.span" })}
      aria-hidden="true"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-e-transparent",
        size === "sm" ? "h-4 w-4" : "h-6 w-6",
      )}
    />
  );
}

export function ManagerButton({
  ui,
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  ui: UiDescriptor;
  variant?: "primary" | "secondary" | "icon";
}) {
  return (
    <button
      {...props}
      {...uiAttributes(ui)}
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
  const instance = createOpaqueUiInstanceId("storage-image-slot-frame", id ?? "frame");
  return (
    <div {...uiAttributes({ uid: "packages.storage-image-manager-core.storage-image-manager-ui.div-1BFgja", id: "packages.storage-image-manager-core.storage-image-manager-ui.div", instance: instance })} className="w-full min-w-0 overflow-hidden rounded-lg border-2 border-primary/20 bg-primary/5 p-0.5">
      <div {...uiAttributes({ uid: "packages.storage-image-manager-core.storage-image-manager-ui.div.2-YFd63f", id: "packages.storage-image-manager-core.storage-image-manager-ui.div.2", instance: instance })}
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
    <div {...uiAttributes({ uid: "packages.storage-image-manager-core.storage-image-manager-ui.div.3-5RPue7", id: "packages.storage-image-manager-core.storage-image-manager-ui.div.3" })}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
    >
      <div {...uiAttributes({ uid: "packages.storage-image-manager-core.storage-image-manager-ui.div.4-ZA88qS", id: "packages.storage-image-manager-core.storage-image-manager-ui.div.4" })}
        className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="storage-dialog-title"
      >
        <h2 {...uiAttributes({ uid: "packages.storage-image-manager-core.storage-image-manager-ui.h2-6FMV3W", id: "packages.storage-image-manager-core.storage-image-manager-ui.h2" })} id="storage-dialog-title" className="text-lg font-semibold">
          {state.title}
        </h2>
        <p {...uiAttributes({ uid: "packages.storage-image-manager-core.storage-image-manager-ui.p-g3HrLz", id: "packages.storage-image-manager-core.storage-image-manager-ui.p" })} className="mt-2 text-sm text-muted-foreground">{state.message}</p>
        <div {...uiAttributes({ uid: "packages.storage-image-manager-core.storage-image-manager-ui.div.5-3O7O4w", id: "packages.storage-image-manager-core.storage-image-manager-ui.div.5" })} className="mt-5 flex justify-end gap-2">
          {state.kind !== "error" ? (
            <>
              <ManagerButton ui={{ uid: "packages.storage-image-manager-core.storage-image-manager-ui.manager-button-gUmgY1", id: "packages.storage-image-manager-core.storage-image-manager-ui.manager-button" }} type="button" variant="secondary" onClick={onClose}>
                {cancelLabel}
              </ManagerButton>
              <ManagerButton ui={{ uid: "packages.storage-image-manager-core.storage-image-manager-ui.manager-button.2-JHz5x4", id: "packages.storage-image-manager-core.storage-image-manager-ui.manager-button.2" }}
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
            <ManagerButton ui={{ uid: "packages.storage-image-manager-core.storage-image-manager-ui.manager-button.3-6EdkzY", id: "packages.storage-image-manager-core.storage-image-manager-ui.manager-button.3" }} type="button" onClick={onClose}>
              {closeLabel}
            </ManagerButton>
          )}
        </div>
      </div>
    </div>
  );
}
