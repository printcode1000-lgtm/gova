'use client';

import * as React from 'react';
import { Package, ShoppingBag, Users, Star, DollarSign, TrendingUp, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MerchantOverview as MerchantOverviewType } from '@/lib/merchant/types';
import { formatCurrency, formatCompactNumber } from '@/lib/merchant/utils';
import { useTranslation } from '@/lib/i18n';

interface MerchantOverviewProps {
  overview: MerchantOverviewType;
  className?: string;
}

const getOverviewCards = (t: (key: string) => string) => [
  { key: 'productsCount', label: t('seller.overview.products'), icon: Package, format: 'number' },
  { key: 'ordersCount', label: t('seller.overview.orders'), icon: ShoppingBag, format: 'number' },
  { key: 'customersCount', label: t('seller.overview.customers'), icon: Users, format: 'number' },
  { key: 'rating', label: t('seller.overview.rating'), icon: Star, format: 'rating' },
  { key: 'revenue', label: t('seller.overview.revenue'), icon: DollarSign, format: 'currency' },
  { key: 'completionRate', label: t('seller.overview.completionRate'), icon: TrendingUp, format: 'percentage' },
  { key: 'responseRate', label: t('seller.overview.responseRate'), icon: MessageCircle, format: 'percentage' },
] as const;

export function MerchantOverview({ overview, className }: MerchantOverviewProps) {
  const { t } = useTranslation();
  const overviewCards = getOverviewCards(t);

  return (
    <section className={cn('', className)}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        {overviewCards.map(({ key, label, icon: Icon, format }) => {
          const value = overview[key];
          let displayValue: string;

          switch (format) {
            case 'currency':
              displayValue = formatCurrency(value as number);
              break;
            case 'percentage':
              displayValue = `${value}%`;
              break;
            case 'rating':
              displayValue = value.toFixed(1);
              break;
            case 'number':
              displayValue = formatCompactNumber(value as number);
              break;
            default:
              displayValue = String(value);
          }

          return (
            <Card
              key={key}
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6">
                <div className="mb-3 asol-merchant-icon-well p-2.5 transition-colors group-hover:opacity-90">
                  <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <span className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {displayValue}
                </span>
                <span className="mt-1 text-center text-xs text-muted-foreground sm:text-sm">
                  {label}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export default MerchantOverview;
