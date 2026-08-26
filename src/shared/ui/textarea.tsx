import * as React from 'react';

import { cn } from '@/shared/utils';
import { type UiDescriptor } from '@asol/ui-registry-core';

import { uiPrimitiveAttributes } from './ui-primitive-attributes';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  ui?: UiDescriptor;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, disabled, ui, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'asol-control asol-field-surface flex min-h-[80px] w-full border border-input text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        disabled={disabled}
        ref={ref}
        {...props}
        {...uiPrimitiveAttributes('textarea', ui, disabled ? 'disabled' : undefined)}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
