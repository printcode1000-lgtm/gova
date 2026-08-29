'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/utils';
import { type UiDescriptor } from '@asol/ui-registry-core';

import { uiPrimitiveAttributes } from './ui-primitive-attributes';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants> & { ui?: UiDescriptor }
>(({ className, ui, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
    {...uiPrimitiveAttributes('label', ui)}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
