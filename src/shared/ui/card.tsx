import * as React from 'react';

import { cn } from '@/shared/utils';
import { type UiDescriptor } from '@asol/ui-registry-core';

import { uiPrimitiveAttributes } from './ui-primitive-attributes';

interface CardUiProps {
  ui?: UiDescriptor;
}

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CardUiProps
>(({ className, ui, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'asol-card-neutral text-card-foreground',
      className
    )}
    {...props}
    {...uiPrimitiveAttributes('card', ui)}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CardUiProps
>(({ className, ui, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
    {...uiPrimitiveAttributes('card-header', ui)}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & CardUiProps
>(({ className, ui, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
    {...uiPrimitiveAttributes('card-title', ui)}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & CardUiProps
>(({ className, ui, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
    {...uiPrimitiveAttributes('card-description', ui)}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CardUiProps
>(({ className, ui, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} {...uiPrimitiveAttributes('card-content', ui)} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CardUiProps
>(({ className, ui, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
    {...uiPrimitiveAttributes('card-footer', ui)}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
