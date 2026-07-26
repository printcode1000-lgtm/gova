'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className, ...props }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn('flex items-center justify-center', className)} {...props}>
      <div
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
