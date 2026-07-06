'use client';

import * as React from 'react';
import { MapPin, Calendar, CheckCircle2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Merchant } from '@/lib/merchant/types';
import { formatCompactNumber, formatDate, getMerchantStatusColor } from '@/lib/merchant/utils';
import { useTranslation } from '@/lib/i18n';

interface MerchantHeroProps {
  merchant: Merchant;
  className?: string;
}

export function MerchantHero({ merchant, className }: MerchantHeroProps) {
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = React.useState(false);

  return (
    <section className={cn('relative', className)}>
      {/* Banner Image */}
      <div className="relative h-64 sm:h-80 lg:h-96 w-full overflow-hidden rounded-b-2xl">
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 transition-opacity duration-500',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{ zIndex: 1 }}
        />
        <img
          src={merchant.banner}
          alt={`${merchant.name} banner`}
          className={cn(
            'h-full w-full object-cover transition-all duration-500',
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          )}
          onLoad={() => setImageLoaded(true)}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}
      </div>

      {/* Merchant Info Section */}
      <div className="container relative -mt-20 px-4 sm:px-6 lg:-mt-24">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:gap-8">
          {/* Logo/Avatar */}
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl sm:h-40 sm:w-40">
              <AvatarImage src={merchant.logo} alt={merchant.name} />
              <AvatarFallback className="text-4xl font-light">
                {merchant.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {/* Status Indicator */}
            <div
              className={cn(
                'absolute bottom-2 right-2 h-5 w-5 rounded-full border-2 border-background',
                getMerchantStatusColor(merchant.status)
              )}
              aria-label={`Status: ${merchant.status}`}
            />
          </div>

          {/* Merchant Details */}
          <div className="flex-1 space-y-3 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {merchant.name}
              </h1>
              {merchant.verified && (
                <Badge
                  variant="secondary"
                  className="gap-1.5 bg-merchant-gold/10 text-merchant-gold border-merchant-gold/30"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('seller.hero.verified')}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="outline" className="font-normal">
                {merchant.category}
              </Badge>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>
                  {merchant.location.city}, {merchant.location.country}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{t('seller.hero.joined')} {formatDate(merchant.joinedDate)}</span>
              </div>
            </div>

            {/* Social Metrics */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">
                  {formatCompactNumber(merchant.social.followers)}
                </span>
                <span className="text-sm text-muted-foreground">{t('seller.hero.followers')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">
                  {formatCompactNumber(merchant.social.following)}
                </span>
                <span className="text-sm text-muted-foreground">{t('seller.hero.following')}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pb-4">
            <Button size="lg" className="gap-2">
              <Users className="h-4 w-4" />
              {t('seller.hero.follow')}
            </Button>
            <Button variant="outline" size="lg">
              {t('seller.hero.message')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MerchantHero;
