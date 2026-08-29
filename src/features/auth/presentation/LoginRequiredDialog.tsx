"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { uiAttributes } from "@asol/ui-registry-core";

interface LoginRequiredDialogProps {
  open: boolean;
  title: string;
  description: string;
  signInLabel: string;
  cancelLabel: string;
  signInHref?: string;
  onCancel: () => void;
}

/**
 * Modern sign-in gate for protected pages. Closing the dialog (overlay, Escape,
 * or cancel) should navigate the user away — the page behind stays inaccessible.
 */
export function LoginRequiredDialog({
  open,
  title,
  description,
  signInLabel,
  cancelLabel,
  signInHref = "/login",
  onCancel,
}: LoginRequiredDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent id="auth.login-required-dialog.dialog-content" className="z-[100] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-[1.75rem] border-primary/20 p-0 shadow-2xl duration-300 data-[state=closed]:zoom-out-50 data-[state=open]:zoom-in-50 [&>button.absolute]:hidden">
        <div {...uiAttributes({ uid: "auth.login-required-dialog.div.4-HLeu10", id: "auth.login-required-dialog.div.4" })} id="auth.login-required-dialog.div" className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background px-6 pb-5 pt-7">
          <div {...uiAttributes({ uid: "auth.login-required-dialog.div.5-Ej8URo", id: "auth.login-required-dialog.div.5" })} id="auth.login-required-dialog.div.2" className="absolute -end-12 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div {...uiAttributes({ uid: "auth.login-required-dialog.div.6-07Awma", id: "auth.login-required-dialog.div.6" })} id="auth.login-required-dialog.div.3" className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/25">
            <LogIn id="auth.login-required-dialog.log-in" className="h-8 w-8" aria-hidden="true" />
          </div>
          <DialogHeader id="auth.login-required-dialog.dialog-header" className="relative mt-5 text-center sm:text-center">
            <DialogTitle id="auth.login-required-dialog.dialog-title" className="text-2xl leading-tight">{title}</DialogTitle>
            <DialogDescription id="auth.login-required-dialog.dialog-description" className="pt-2 text-sm leading-6 text-on-surface-variant">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <DialogFooter id="auth.login-required-dialog.dialog-footer" className="gap-2 px-6 pb-6 pt-2 sm:flex-col sm:space-x-0">
          <Button id="auth.login-required-dialog.button" ui={{ uid: "auth.login-required.sign-in-U4FYdd", id: "auth.login-required.sign-in", kind: "action", action: "navigate-sign-in", part: "dialog-footer" }} asChild size="lg" className="w-full rounded-xl">
            <Link id="auth.login-required-dialog.link" href={signInHref}>{signInLabel}</Link>
          </Button>
          <Button id="auth.login-required-dialog.button.2" ui={{ uid: "auth.login-required.cancel-AMw7D2", id: "auth.login-required.cancel", kind: "action", action: "cancel", part: "dialog-footer" }}
            type="button"
            size="lg"
            variant="ghost"
            onClick={onCancel}
            className="w-full rounded-xl"
          >
            {cancelLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
