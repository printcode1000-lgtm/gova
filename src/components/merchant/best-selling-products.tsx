'use client';

import * as React from 'react';
import { ChevronRight, Star, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/merchant/types';
import { formatCurrency, getStockStatusColor } from '@/lib/merchant/utils';

interface BestSellingProductsProps {
  products: Product[];
  className?: string;
}

export function BestSellingProducts({ products, className }: BestSellingProductsProps) {
  return (
    <section className={cn('', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Best Selling Products</h2>
        <Button variant="ghost" size="sm" className="gap-1 text-sm">
          View All
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {products.map((product) => (
          <Card
            key={product.id}
            className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg"
          >
            {/* Product Image */}
            <div className="relative aspect-square overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {product.originalPrice && (
                <Badge className="absolute top-2 left-2 bg-destructive">
                  {Math.round(
                    ((product.originalPrice - product.price) / product.originalPrice) * 100
                  )}
                  % OFF
                </Badge>
              )}
              {/* Stock Indicator */}
              <div className="absolute bottom-2 left-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'bg-background/80 backdrop-blur-sm',
                    product.stockStatus === 'out_of_stock' && 'border-destructive text-destructive'
                  )}
                >
                  <Package
                    className={cn('mr-1 h-3 w-3', getStockStatusColor(product.stockStatus))}
                  />
                  <span className="capitalize text-xs">
                    {product.stockStatus.replace('_', ' ')}
                  </span>
                </Badge>
              </div>
            </div>

            <CardContent className="p-3">
              {/* Product Name */}
              <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-tight">
                {product.name}
              </h3>

              {/* Price */}
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-lg font-bold">
                  {formatCurrency(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCurrency(product.originalPrice)}
                  </span>
                )}
              </div>

              {/* Rating & Sales */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-merchant-gold text-merchant-gold" />
                  <span className="text-sm font-medium">{product.rating}</span>
                  <span className="text-xs text-muted-foreground">
                    ({product.reviewCount})
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {product.salesCount.toLocaleString()} sold
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default BestSellingProducts;
