'use client';

import { cn } from '@/lib/utils';
import type { MerchantProfileData } from '@/lib/merchant/types';
import { mockMerchantProfile } from '@/lib/merchant/mock-data';
import {
  MerchantHero,
  MerchantOverview,
  QuickActions,
  StoreInformation,
  PerformanceDashboard,
  FeaturedCollections,
  BestSellingProducts,
  RecentOrders,
  CustomerReviews,
  TrustCredibility,
} from '@/components/merchant';

interface MerchantProfilePageProps {
  merchantId?: string;
  className?: string;
}

export function MerchantProfilePage({ className }: MerchantProfilePageProps) {
  const data: MerchantProfileData = mockMerchantProfile;

  return (
    <main className={cn('asol-canvas', className)}>
      <MerchantHero merchant={data.merchant} />

      <div className="container px-4 sm:px-6 py-8 space-y-6">
        <section className="asol-merchant-band asol-merchant-band-primary">
          <MerchantOverview overview={data.overview} />
        </section>

        <section className="asol-merchant-band asol-merchant-band-tertiary">
          <QuickActions actions={data.quickActions} />
        </section>

        <section className="asol-merchant-band asol-merchant-band-secondary">
          <PerformanceDashboard performance={data.performance} />
        </section>

        <section className="asol-merchant-band asol-merchant-band-primary">
          <FeaturedCollections collections={data.collections} />
        </section>

        <section className="asol-merchant-band asol-merchant-band-tertiary">
          <BestSellingProducts products={data.bestSellingProducts} />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <section className="asol-merchant-band asol-merchant-band-secondary">
              <RecentOrders orders={data.recentOrders} />
            </section>
            <section className="asol-merchant-band asol-merchant-band-error">
              <CustomerReviews
                reviews={data.reviews}
                ratingDistribution={data.ratingDistribution}
                averageRating={data.merchant.metrics.rating}
                totalReviews={data.merchant.metrics.reviewCount}
              />
            </section>
          </div>
          <div className="space-y-6">
            <section className="asol-merchant-band asol-merchant-band-primary">
              <StoreInformation store={data.storeInformation} />
            </section>
            <section className="asol-merchant-band asol-merchant-band-tertiary">
              <TrustCredibility
                credentials={data.trustCredentials}
                achievements={data.achievements}
                badges={data.badges}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export default MerchantProfilePage;
