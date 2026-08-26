import * as React from 'react';

import { cn } from '@/shared/utils';
import { type UiDescriptor } from '@asol/ui-registry-core';

import { uiPrimitiveAttributes } from './ui-primitive-attributes';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  ui?: UiDescriptor;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, disabled, ui, ...props }, ref) => {
    return (
      <input
        type={type}
        disabled={disabled}
        className={cn(
          'asol-control asol-field-surface flex w-full border border-input text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
        {...uiPrimitiveAttributes('input', ui, disabled ? 'disabled' : undefined)}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
