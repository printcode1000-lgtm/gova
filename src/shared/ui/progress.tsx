'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '@/shared/utils';
import { type UiDescriptor, uiAttributes } from '@asol/ui-registry-core';

import { uiPrimitiveAttributes } from './ui-primitive-attributes';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { ui?: UiDescriptor }
>(({ className, value, ui, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
      className
    )}
    {...props}
    {...uiPrimitiveAttributes('progress', ui)}
  >
    <ProgressPrimitive.Indicator
      {...uiAttributes({
        uid: 'shared.ui.progress.indicator-H9wZ4b',
        id: 'shared.ui.progress.indicator',
        instance: ui?.instance,
      })}
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
