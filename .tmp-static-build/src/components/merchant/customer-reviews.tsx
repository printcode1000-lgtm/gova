'use client';

import * as React from 'react';
import { ChevronRight, Star, ThumbsUp, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Review, RatingDistribution } from '@/lib/merchant/types';
import { formatRelativeTime, calculateRatingPercentage } from '@/lib/merchant/utils';
import { useTranslation } from '@/lib/i18n';

interface CustomerReviewsProps {
  reviews: Review[];
  ratingDistribution: RatingDistribution;
  averageRating: number;
  totalReviews: number;
  className?: string;
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5',
            star <= rating
              ? 'fill-merchant-gold text-merchant-gold'
              : 'text-muted-foreground'
          )}
        />
      ))}
    </div>
  );
}

function RatingBar({
  stars,
  count,
  totalReviews,
  t,
}: {
  stars: number;
  count: number;
  totalReviews: number;
  t: (key: string) => string;
}) {
  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-sm font-medium">
        {stars} {stars === 1 ? t('seller.reviews.star') : t('seller.reviews.stars')}
      </span>
      <Progress value={percentage} className="h-2 flex-1" />
      <span className="w-12 text-right text-sm text-muted-foreground">
        {count.toLocaleString()}
      </span>
    </div>
  );
}

function ReviewCard({ review, t }: { review: Review; t: (key: string) => string }) {
  return (
    <div className="space-y-3 p-4 sm:p-5 transition-colors hover:bg-muted/30">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={review.customer.avatar} alt={review.customer.name} />
          <AvatarFallback>
            {review.customer.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm">{review.customer.name}</span>
            <StarRating rating={review.rating} />
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(review.createdAt)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('seller.reviews.purchased')}: {review.productName}
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed pl-0 sm:pl-13">{review.comment}</p>

      <div className="flex items-center gap-4 pl-0 sm:pl-13">
        <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-muted-foreground">
          <ThumbsUp className="h-3.5 w-3.5" />
          <span className="text-xs">{t('seller.reviews.helpful')} ({review.helpful})</span>
        </Button>
      </div>
    </div>
  );
}

export function CustomerReviews({
  reviews,
  ratingDistribution,
  averageRating,
  totalReviews,
  className,
}: CustomerReviewsProps) {
  const { t } = useTranslation();

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <div className="gova-ring-error p-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">{t('seller.reviews.title')}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-sm">
          {t('seller.reviews.viewAll')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        {/* Rating Summary */}
        <div className="grid gap-6 p-4 sm:p-6 sm:grid-cols-2">
          {/* Overall Rating */}
          <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg bg-muted/30">
            <span className="text-5xl font-bold">{averageRating.toFixed(1)}</span>
            <StarRating rating={Math.round(averageRating)} size="lg" />
            <span className="text-sm text-muted-foreground">
              {t('seller.reviews.basedOn')} {totalReviews.toLocaleString()} {t('seller.reviews.reviews')}
            </span>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((stars) => (
              <RatingBar
                key={stars}
                stars={stars}
                count={
                  ratingDistribution[
                    stars === 5
                      ? 'five'
                      : stars === 4
                      ? 'four'
                      : stars === 3
                      ? 'three'
                      : stars === 2
                      ? 'two'
                      : 'one'
                  ]
                }
                totalReviews={totalReviews}
                t={t}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Recent Reviews */}
        <div className="divide-y">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} t={t} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default CustomerReviews;
