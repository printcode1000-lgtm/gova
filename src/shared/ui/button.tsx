import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/utils';

const buttonVariants = cva(
  'asol-control inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground active:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground active:bg-destructive/90',
        outline:
          'asol-surface-neutral border border-input active:bg-accent active:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground active:bg-secondary/80',
        ghost: 'active:bg-accent active:text-accent-foreground',
        link: 'text-primary underline-offset-4 active:underline',
      },
      size: {
        default: '',
        sm: 'text-xs [--asol-control-min-height:2.25rem] [--asol-density-scale:0.92]',
        lg: 'text-base [--asol-control-min-height:2.875rem] [--asol-density-scale:1.08]',
        icon: 'asol-control-icon aspect-square p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

/**
 * Compact action tile: icon stacked above a short label.
 * Overrides the `.asol-control` spacing vars so the control can grow
 * vertically instead of staying on one line, and carries the shared accent
 * treatment so every tile in a row looks identical.
 */
export const ACTION_TILE_CLASS =
  'h-12 min-w-0 shrink-0 flex-col justify-center border bg-surface/80 asol-surface-neutral ' +
  '[--asol-control-gap:0.125rem] [--asol-control-padding-x:0.375rem] ' +
  '[--asol-control-padding-y:0.25rem]';

/**
 * Accent applied inline so it wins over the variant's own colour classes,
 * keeping every tile in a row visually identical.
 */
export const ACTION_TILE_STYLE: React.CSSProperties = {
  color: 'rgb(79, 70, 229)',
  borderColor: 'rgba(79, 70, 229, 0.4)',
  background:
    'linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(79, 70, 229, 0.03))',
};

/** Label under an {@link ACTION_TILE_CLASS} icon. */
export const ACTION_TILE_LABEL_CLASS = 'text-[9px] font-medium leading-tight';

export { Button, buttonVariants };
