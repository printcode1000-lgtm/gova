'use client';

import * as React from 'react';
import { Store, Truck, RefreshCw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { StoreInformation as StoreInformationType } from '@/lib/merchant/types';
import { useTranslation } from '@/lib/i18n';

interface StoreInformationProps {
  store: StoreInformationType;
  className?: string;
}

export function StoreInformation({ store, className }: StoreInformationProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = React.useState(false);
  const MAX_PREVIEW_LENGTH = 150;
  const shouldTruncate = store.about.length > MAX_PREVIEW_LENGTH;
  const displayAbout = expanded || !shouldTruncate
    ? store.about
    : `${store.about.slice(0, MAX_PREVIEW_LENGTH)}...`;

  return (
    <Card className={cn('overflow-hidden transition-all duration-300 hover:shadow-lg', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="asol-merchant-icon-well">
            <Store className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">{t('seller.store.title')}</CardTitle>
            <CardDescription>{t('seller.store.aboutMerchant')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* About Section */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">{t('seller.store.about')}</h4>
          <p className="text-sm leading-relaxed">{displayAbout}</p>
          {shouldTruncate && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 h-8 px-0 text-primary"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  {t('seller.store.showLess')} <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  {t('seller.store.showMore')} <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>

        <Separator />

        {/* Categories */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">{t('seller.store.categories')}</h4>
          <div className="flex flex-wrap gap-2">
            {store.categories.map((category) => (
              <Badge key={category} variant="secondary" className="font-normal">
                {category}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Shipping & Returns */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">{t('seller.store.shippingCoverage')}</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {store.shippingCoverage.slice(0, 4).map((country) => (
                <Badge key={country} variant="outline" className="font-normal text-xs">
                  {country}
                </Badge>
              ))}
              {store.shippingCoverage.length > 4 && (
                <Badge variant="outline" className="font-normal text-xs">
                  +{store.shippingCoverage.length - 4} {t('seller.store.more')}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">{t('seller.store.returnPolicy')}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{store.returnPolicy}</p>
          </div>
        </div>

        <Separator />

        {/* Specialties */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-merchant-gold" />
            <h4 className="font-medium text-sm">{t('seller.store.specialties')}</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {store.specialties.map((specialty) => (
              <Badge
                key={specialty}
                className="bg-merchant-gold/10 text-merchant-gold border-merchant-gold/30 font-normal"
              >
                {specialty}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StoreInformation;
