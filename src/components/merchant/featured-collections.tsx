'use client';

import * as React from 'react';
import { ChevronRight, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Collection } from '@/lib/merchant/types';

interface FeaturedCollectionsProps {
  collections: Collection[];
  className?: string;
}

const typeColors: Record<string, string> = {
  fashion: 'bg-primary/10 text-primary border-primary/30',
  seasonal: 'bg-merchant-gold/10 text-merchant-gold border-merchant-gold/30',
  trending: 'bg-merchant-info/10 text-merchant-info border-merchant-info/30',
};

export function FeaturedCollections({ collections, className }: FeaturedCollectionsProps) {
  return (
    <section className={cn('', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Featured Collections</h2>
        <Button variant="ghost" size="sm" className="gap-1 text-sm">
          View All
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {collections.map((collection) => (
          <Card
            key={collection.id}
            className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={collection.coverImage}
                alt={collection.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
              <Badge
                variant="outline"
                className={cn(
                  'absolute top-3 left-3 capitalize',
                  typeColors[collection.type]
                )}
              >
                {collection.type}
              </Badge>
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="font-semibold text-lg text-foreground">
                  {collection.name}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>{collection.itemCount} items</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default FeaturedCollections;
