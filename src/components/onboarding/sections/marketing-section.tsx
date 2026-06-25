'use client';

import * as React from 'react';
import { Megaphone, Plus, X, Percent, DollarSign, Tag, Calendar } from 'lucide-react';
import { useOnboardingStore } from '@/lib/onboarding';
import { useTranslation } from '@/lib/i18n';
import { FormField, FormInput, FormSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { CouponCode } from '@/lib/onboarding/types';
import { nextSellerId } from '@/lib/seller/next-id';

function generateCouponCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function MarketingSection() {
  const { t } = useTranslation();
  const { data, updateMarketing, markStepComplete } = useOnboardingStore();
  const [newCoupon, setNewCoupon] = React.useState<Partial<CouponCode>>({
    code: generateCouponCode(),
    discountType: 'percentage',
    discountValue: 10,
    minPurchase: 0,
    maxUses: 100,
    isActive: true,
  });

  const { marketing, products } = data;

  const handleNext = () => {
    markStepComplete('marketing');
    return true;
  };

  const addCoupon = () => {
    if (!newCoupon.code) return;
    const coupon: CouponCode = {
      id: nextSellerId('coupon'),
      code: newCoupon.code,
      discountType: newCoupon.discountType as 'percentage' | 'fixed',
      discountValue: newCoupon.discountValue || 0,
      minPurchase: newCoupon.minPurchase || 0,
      maxUses: newCoupon.maxUses || 0,
      usedCount: 0,
      expiresAt: newCoupon.expiresAt || '',
      isActive: true,
    };
    updateMarketing({ coupons: [...marketing.coupons, coupon] });
    setNewCoupon({
      code: generateCouponCode(),
      discountType: 'percentage',
      discountValue: 10,
      minPurchase: 0,
      maxUses: 100,
      isActive: true,
    });
  };

  const removeCoupon = (id: string) => {
    updateMarketing({ coupons: marketing.coupons.filter((c) => c.id !== id) });
  };

  const toggleFeaturedProduct = (productId: string) => {
    const currentFeatured = marketing.featuredProductIds;
    if (currentFeatured.includes(productId)) {
      updateMarketing({ featuredProductIds: currentFeatured.filter((id) => id !== productId) });
    } else if (currentFeatured.length < 6) {
      updateMarketing({ featuredProductIds: [...currentFeatured, productId] });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            {t('onboarding.marketing.title')}
          </CardTitle>
          <CardDescription>{t('onboarding.marketing.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="featured" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="featured">{t('onboarding.marketing.tabs.featured')}</TabsTrigger>
              <TabsTrigger value="coupons">{t('onboarding.marketing.tabs.coupons')}</TabsTrigger>
              <TabsTrigger value="campaigns">{t('onboarding.marketing.tabs.campaigns')}</TabsTrigger>
            </TabsList>

            <TabsContent value="featured" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">{t('onboarding.marketing.featuredTitle')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('onboarding.marketing.featuredDesc')}
                  </p>
                </div>
                <Badge variant="secondary">
                  {t('onboarding.common.selected', { count: marketing.featuredProductIds.length })}
                </Badge>
              </div>

              {products.products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t('onboarding.marketing.noProducts')}</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {products.products.map((product) => (
                    <label
                      key={product.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                        marketing.featuredProductIds.includes(product.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={marketing.featuredProductIds.includes(product.id)}
                        onChange={() => toggleFeaturedProduct(product.id)}
                        disabled={
                          !marketing.featuredProductIds.includes(product.id) &&
                          marketing.featuredProductIds.length >= 6
                        }
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.title}</p>
                        <p className="text-xs text-muted-foreground">${product.basePrice.toFixed(2)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="coupons" className="space-y-6">
              <div className="p-4 rounded-lg border space-y-4">
                <h4 className="font-medium">{t('onboarding.marketing.createCoupon')}</h4>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField label={t('onboarding.marketing.couponCode')} htmlFor="couponCode">
                    <div className="flex gap-2">
                      <FormInput
                        id="couponCode"
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                        className="font-mono uppercase"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setNewCoupon({ ...newCoupon, code: generateCouponCode() })}
                      >
                        <Tag className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormField>

                  <FormField label={t('onboarding.marketing.discountType')} htmlFor="discountType">
                    <FormSelect
                      value={newCoupon.discountType || 'percentage'}
                      onValueChange={(v) =>
                        setNewCoupon({ ...newCoupon, discountType: v as 'percentage' | 'fixed' })
                      }
                      options={[
                        { value: 'percentage', label: t('onboarding.marketing.discountTypes.percentage') },
                        { value: 'fixed', label: t('onboarding.marketing.discountTypes.fixed') },
                      ]}
                    />
                  </FormField>

                  <FormField label={t('onboarding.marketing.discountValue')} htmlFor="discountValue">
                    <div className="relative">
                      {newCoupon.discountType === 'percentage' ? (
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      ) : (
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                      <FormInput
                        type="number"
                        value={newCoupon.discountValue}
                        onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: parseFloat(e.target.value) || 0 })}
                        className="pl-9"
                        min={0}
                        max={newCoupon.discountType === 'percentage' ? 100 : undefined}
                      />
                    </div>
                  </FormField>

                  <FormField label={t('onboarding.marketing.minPurchase')} htmlFor="minPurchase">
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormInput
                        type="number"
                        value={newCoupon.minPurchase}
                        onChange={(e) => setNewCoupon({ ...newCoupon, minPurchase: parseFloat(e.target.value) || 0 })}
                        className="pl-9"
                        min={0}
                      />
                    </div>
                  </FormField>
                </div>

                <Button onClick={addCoupon} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('onboarding.marketing.createCouponBtn')}
                </Button>
              </div>

              {marketing.coupons.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">{t('onboarding.marketing.activeCoupons')}</h4>
                  {marketing.coupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <code className="px-2 py-1 rounded bg-muted font-mono text-sm">
                          {coupon.code}
                        </code>
                        <Badge variant="secondary">
                          {coupon.discountType === 'percentage'
                            ? t('onboarding.marketing.percentOff', { value: coupon.discountValue })
                            : t('onboarding.marketing.amountOff', { value: coupon.discountValue })}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeCoupon(coupon.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('onboarding.marketing.campaignsDesc')}</p>
                <p className="text-sm mt-2">{t('onboarding.marketing.comingSoon')}</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <StepNavigation onNext={handleNext} />
    </div>
  );
}

export default MarketingSection;
