"use client";

import * as React from "react";
import { DismissableLayerBranch } from "@radix-ui/react-dismissable-layer";

import { OVERLAY_CHROME_ATTRIBUTE } from "@/shared/ui/overlay-chrome";

/**
 * Registers floating project chrome with Radix so a modal dialog does not
 * treat a tap on the inspector, error toolbar, or development badge as an
 * outside dismiss.
 */
export const OverlayChromeBranch = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function OverlayChromeBranch({ children, ...props }, ref) {
  return (
    <DismissableLayerBranch
      ref={ref}
      {...{ [OVERLAY_CHROME_ATTRIBUTE]: "true" }}
      {...props}
    >
      {children}
    </DismissableLayerBranch>
  );
});
