"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const switchRootClassName =
  "peer relative inline-flex h-8 w-14 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:border-outline-variant data-[state=unchecked]:bg-surface-variant";

const switchThumbClassName =
  "pointer-events-none absolute top-1 block h-6 w-6 rounded-full bg-white shadow-sm transition-[inset-inline-start] data-[state=checked]:start-7 data-[state=unchecked]:start-1";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(switchRootClassName, className)}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb className={switchThumbClassName} />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch, switchRootClassName, switchThumbClassName };
