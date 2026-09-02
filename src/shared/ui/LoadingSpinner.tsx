'use client';

import * as React from 'react';
import { cn } from '@/shared/utils';


interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className, ...props }: LoadingSpinnerProps & { id?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div id="shared-ui-loadingspinner-div-1-omivvs"
      className={cn('flex items-center justify-center', className)}
      {...props}
    >
      <div id="shared-ui-loadingspinner-div-2-qdangp"
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
