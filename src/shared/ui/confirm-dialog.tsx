"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

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
  id?: string;
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
 * caller has to remember to.
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
}: ConfirmDialogProps & { id?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id={id} className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {tone === "destructive" ? (
              <AlertTriangle className="h-5 w-5 text-error" aria-hidden="true" />
            ) : null}
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-on-surface-variant">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
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
