'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';

import { cn } from '@/shared/utils';
import { type UiDescriptor, uiAttributes } from '@asol/ui-registry-core';

import { uiPrimitiveAttributes } from './ui-primitive-attributes';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & { ui?: UiDescriptor }
>(({ className, ui, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn('grid gap-2', className)}
      {...props}
      {...uiPrimitiveAttributes('radio-group', ui)}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & { ui?: UiDescriptor }
>(({ className, disabled, ui, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      disabled={disabled}
      className={cn(
        'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
      {...uiPrimitiveAttributes('radio-group-item', ui, disabled ? 'disabled' : undefined)}
    >
      <RadioGroupPrimitive.Indicator
        {...uiAttributes({
          uid: 'shared.ui.radio-group.indicator-D7xQ2m',
          id: 'shared.ui.radio-group.indicator',
          instance: ui?.instance,
        })}
        className="flex items-center justify-center"
      >
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
