'use client';

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function MerchantHeroSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn('relative', className)}>
      <div className="relative h-64 sm:h-80 lg:h-96 w-full overflow-hidden rounded-b-2xl">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="container relative -mt-20 px-4 sm:px-6 lg:-mt-24">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:gap-8">
          <Skeleton className="h-32 w-32 sm:h-40 sm:w-40 rounded-full border-4 border-background" />
          <div className="flex-1 space-y-3 pb-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-3 pb-4">
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-11 w-24" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function MerchantOverviewSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7', className)}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6">
            <Skeleton className="h-10 w-10 rounded-full mb-3" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-4 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function QuickActionsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7', className)}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center p-4">
            <div className="relative">
              <Skeleton className="h-12 w-12 rounded-full mb-3" />
              <Skeleton className="absolute -right-1 -top-1 h-5 w-5 rounded-full" />
            </div>
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PerformanceDashboardSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn('', className)}>
      <Skeleton className="h-8 w-52 mb-4" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function CollectionsSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn('', className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-[4/3]" />
          </Card>
        ))}
      </div>
    </section>
  );
}

export function ProductsSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn('', className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-square" />
            <CardContent className="p-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function OrdersSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-6 w-36" />
        </div>
        <Skeleton className="h-8 w-20" />
      </CardHeader>
      <CardContent className="p-0 divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ReviewsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-6 w-36" />
        </div>
        <Skeleton className="h-8 w-20" />
      </CardHeader>
      <CardContent className="p-0 divide-y">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 sm:p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TrustSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MerchantPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-500">
      <MerchantHeroSkeleton />
      <div className="container px-4 sm:px-6 py-8 space-y-8">
        <MerchantOverviewSkeleton />
        <QuickActionsSkeleton />
        <PerformanceDashboardSkeleton />
        <CollectionsSkeleton />
        <ProductsSkeleton />
        <div className="grid gap-6 lg:grid-cols-2">
          <OrdersSkeleton />
          <ReviewsSkeleton />
        </div>
        <TrustSkeleton />
      </div>
    </div>
  );
}

export default MerchantPageSkeleton;
