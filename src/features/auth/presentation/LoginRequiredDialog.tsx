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
      <DialogContent className="z-[100] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-[1.75rem] border-primary/20 p-0 shadow-2xl duration-300 data-[state=closed]:zoom-out-50 data-[state=open]:zoom-in-50 [&>button.absolute]:hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background px-6 pb-5 pt-7">
          <div className="absolute -end-12 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/25">
            <LogIn className="h-8 w-8" aria-hidden="true" />
          </div>
          <DialogHeader className="relative mt-5 text-center sm:text-center">
            <DialogTitle className="text-2xl leading-tight">{title}</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-6 text-on-surface-variant">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <DialogFooter className="gap-2 px-6 pb-6 pt-2 sm:flex-col sm:space-x-0">
          <Button asChild size="lg" className="w-full rounded-xl">
            <Link href={signInHref}>{signInLabel}</Link>
          </Button>
          <Button
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
