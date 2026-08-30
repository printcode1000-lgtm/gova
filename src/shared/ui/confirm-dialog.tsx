"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { createOpaqueUiInstanceId } from "@asol/ui-registry-core";

import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

export interface ConfirmDialogProps {
  id: string;
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Destructive confirmations are styled as such; the default is neutral. */
  tone?: "default" | "destructive";
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * One answer to "are you sure?" for the whole application.
 *
 * The dialog owns nothing but the question: the caller decides what is being
 * confirmed and what happens on yes, and it closes itself either way so no
 * caller has to remember to. The authored id is also the stable usage-site
 * scope that distinguishes two ConfirmDialog render sites at runtime.
 */
export function ConfirmDialog({
  id,
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "default",
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  const instance = createOpaqueUiInstanceId("confirm-dialog", id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ui={{
          uid: "shared.confirm-dialog.content-1p9SW8",
          id: "shared.confirm-dialog.content",
          instance,
        }}
        id={id}
        className="max-w-sm"
      >
        <DialogHeader
          ui={{
            uid: "shared.confirm-dialog.dialog-header-5jp7QZ",
            id: "shared.confirm-dialog.dialog-header",
            instance,
          }}
        >
          <DialogTitle
            ui={{
              uid: "shared.confirm-dialog.dialog-title-nA4Pye",
              id: "shared.confirm-dialog.dialog-title",
              instance,
            }}
            className="flex items-center gap-2 text-base"
          >
            {tone === "destructive" ? (
              <AlertTriangle className="h-5 w-5 text-error" aria-hidden="true" />
            ) : null}
            {title}
          </DialogTitle>
          <DialogDescription
            ui={{
              uid: "shared.confirm-dialog.dialog-description-IiGu4p",
              id: "shared.confirm-dialog.dialog-description",
              instance,
            }}
            className="text-sm text-on-surface-variant"
          >
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter
          ui={{
            uid: "shared.confirm-dialog.dialog-footer-TSOQS2",
            id: "shared.confirm-dialog.dialog-footer",
            instance,
          }}
          className="gap-2"
        >
          <Button
            ui={{
              uid: "shared.confirm-dialog.button-D4WPM3",
              id: "shared.confirm-dialog.button",
              instance,
            }}
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            ui={{
              uid: "shared.confirm-dialog.button.2-Uo8Nog",
              id: "shared.confirm-dialog.button.2",
              instance,
            }}
            type="button"
            variant={tone === "destructive" ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
