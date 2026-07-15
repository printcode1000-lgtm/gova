'use client';

import * as React from 'react';
import { Package, ShoppingBag, Star, Image, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

function EmptyState({
  icon: Icon = Package,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="asol-ring-primary rounded-full p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
        {action && (
          <Button onClick={action.onClick} variant="outline" size="sm">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyProducts({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Package}
      title="No products yet"
      description="Start adding products to your store to showcase your offerings to customers."
      action={{
        label: 'Add Product',
        onClick: () => console.log('Add product'),
      }}
      className={className}
    />
  );
}

export function EmptyOrders({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={ShoppingBag}
      title="No orders yet"
      description="When customers place orders, they will appear here."
      className={className}
    />
  );
}

export function EmptyReviews({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Star}
      title="No reviews yet"
      description="Customer reviews will appear here after your first sales."
      className={className}
    />
  );
}

export function EmptyCollections({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Image}
      title="No collections yet"
      description="Create collections to organize and showcase your products."
      action={{
        label: 'Create Collection',
        onClick: () => console.log('Create collection'),
      }}
      className={className}
    />
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this content. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default EmptyState;
