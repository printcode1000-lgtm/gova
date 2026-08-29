"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/shared/utils";
import { preventDismissForOverlayChrome } from "@/shared/ui/overlay-chrome";
import { type UiDescriptor, uiAttributes } from "@asol/ui-registry-core";

import { uiPrimitiveAttributes } from "./ui-primitive-attributes";

interface DialogUiProps {
  ui?: UiDescriptor;
}

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & DialogUiProps
>(({ className, ui, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    {...uiPrimitiveAttributes("dialog-overlay", ui)}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & DialogUiProps
>(({ className, children, onPointerDownOutside, onInteractOutside, onFocusOutside, ui, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay
      ui={{
        uid: "shared.dialog.dialog-overlay-7XstQq",
        id: "shared.dialog.dialog-overlay",
        instance: ui?.instance,
      }}
    />
    <DialogPrimitive.Content
      ref={ref}
      onPointerDownOutside={(event) => {
        preventDismissForOverlayChrome(event);
        onPointerDownOutside?.(event);
      }}
      onInteractOutside={(event) => {
        preventDismissForOverlayChrome(event);
        onInteractOutside?.(event);
      }}
      onFocusOutside={(event) => {
        preventDismissForOverlayChrome(event);
        onFocusOutside?.(event);
      }}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className,
      )}
      {...props}
      {...uiPrimitiveAttributes("dialog-content", ui)}
    >
      {children}
      <DialogPrimitive.Close
        {...uiAttributes({
          uid: "shared.ui.dialog.close-button-Q3nK7c",
          id: "shared.ui.dialog.close-button",
          instance: ui?.instance,
        })}
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground rtl:left-4 rtl:right-auto"
      >
        <X className="h-4 w-4" />
        <span
          {...uiAttributes({
            uid: "shared.dialog.span-7R7XF4",
            id: "shared.dialog.span",
            instance: ui?.instance,
          })}
          className="sr-only"
        >
          Close
        </span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ui,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & DialogUiProps) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className,
    )}
    {...props}
    {...uiPrimitiveAttributes("dialog-header", ui)}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ui,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & DialogUiProps) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
    {...uiPrimitiveAttributes("dialog-footer", ui)}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> & DialogUiProps
>(({ className, ui, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
    {...uiPrimitiveAttributes("dialog-title", ui)}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> & DialogUiProps
>(({ className, ui, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
    {...uiPrimitiveAttributes("dialog-description", ui)}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
