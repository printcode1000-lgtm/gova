import * as React from 'react';

import { cn } from '@/shared/utils';


export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, disabled, ...props }, ref) => {
    return (
      <textarea id={props.id}
        className={cn(
          'asol-control asol-field-surface flex min-h-[80px] w-full border border-input text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        disabled={disabled}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
