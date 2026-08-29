'use client';

import * as React from 'react';
import { cn } from '@/shared/utils';
import { type UiDescriptor, uiAttributes } from '@asol/ui-registry-core';

import { uiPrimitiveAttributes } from './ui-primitive-attributes';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ui?: UiDescriptor;
}

export function LoadingSpinner({ size = 'md', className, ui, ...props }: LoadingSpinnerProps & { id?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={cn('flex items-center justify-center', className)}
      {...props}
      {...uiPrimitiveAttributes('loading-spinner', ui)}
    >
      <div
        {...uiAttributes({
          uid: 'shared.ui.loading-spinner.arc-M8p2Rt',
          id: 'shared.ui.loading-spinner.arc',
          instance: ui?.instance,
        })}
        className={cn(
          'rounded-full animate-spin',
          sizeClasses[size]
        )}
        style={{
          background: 'conic-gradient(from 0deg, var(--color-primary), var(--color-tertiary), var(--color-secondary), var(--color-primary))',
          mask: 'radial-gradient(transparent 60%, black 61%)',
          WebkitMask: 'radial-gradient(transparent 60%, black 61%)',
          animationDuration: '1s',
        }}
      />
    </div>
  );
}
