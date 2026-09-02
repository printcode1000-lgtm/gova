'use client';

import * as React from 'react';
import { Megaphone, Plus, X, Percent, DollarSign, Tag, Calendar } from 'lucide-react';
import { useOnboardingStore } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { FormField, FormInput, FormSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Label } from '@/shared/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { cn } from '@/shared/utils';
import type { CouponCode } from '@/features/onboarding/domain/types';
import { nextSellerId } from '@/features/onboarding/domain/next-id';
import { generateCouponCode } from './marketing-section-model';

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
    <div id='onboarding-presentation-sections-marketing-section-div-1-zwqooj' className="space-y-6 animate-in fade-in duration-300">
      <Card id='onboarding-presentation-sections-marketing-section-card-2-cniyld'>
        <CardHeader id='onboarding-presentation-sections-marketing-section-cardheader-3-myzpdx'>
          <CardTitle id='onboarding-presentation-sections-marketing-section-cardtitle-4-1gxpn0' className="flex items-center gap-2">
            <Megaphone id='onboarding-presentation-sections-marketing-section-megaphone-5-rvfduq' className="h-5 w-5" />
            {t('onboarding.marketing.title')}
          </CardTitle>
          <CardDescription id='onboarding-presentation-sections-marketing-section-carddescription-6-hkbkbz'>{t('onboarding.marketing.description')}</CardDescription>
        </CardHeader>
        <CardContent id='onboarding-presentation-sections-marketing-section-cardcontent-7-dnxcha'>
          <Tabs defaultValue="featured" className="space-y-6">
            <TabsList id='onboarding-presentation-sections-marketing-section-tabslist-8-5oh63j' className="grid w-full grid-cols-3">
              <TabsTrigger id='onboarding-presentation-sections-marketing-section-tabstrigger-9-z79wyg' value="featured">{t('onboarding.marketing.tabs.featured')}</TabsTrigger>
              <TabsTrigger id='onboarding-presentation-sections-marketing-section-tabstrigger-10-5xqdyf' value="coupons">{t('onboarding.marketing.tabs.coupons')}</TabsTrigger>
              <TabsTrigger id='onboarding-presentation-sections-marketing-section-tabstrigger-11-zfr0bk' value="campaigns">{t('onboarding.marketing.tabs.campaigns')}</TabsTrigger>
            </TabsList>

            <TabsContent id='onboarding-presentation-sections-marketing-section-tabscontent-12-q2v8vh' value="featured" className="space-y-4">
              <div id='onboarding-presentation-sections-marketing-section-div-13-8gpyfk' className="flex items-center justify-between">
                <div id='onboarding-presentation-sections-marketing-section-div-14-rewfv7'>
                  <Label id='onboarding-presentation-sections-marketing-section-label-15-65qvsl' className="font-medium">{t('onboarding.marketing.featuredTitle')}</Label>
                  <p id='onboarding-presentation-sections-marketing-section-text-16-ngokkk' className="text-sm text-muted-foreground">
                    {t('onboarding.marketing.featuredDesc')}
                  </p>
                </div>
                <Badge id='onboarding-presentation-sections-marketing-section-badge-17-bi7bhu' variant="secondary">
                  {t('onboarding.common.selected', { count: marketing.featuredProductIds.length })}
                </Badge>
              </div>

              {products.products.length === 0 ? (
                <div id='onboarding-presentation-sections-marketing-section-div-18-vbbe1h' className="text-center py-8 text-muted-foreground">
                  <Tag id='onboarding-presentation-sections-marketing-section-tag-19-vkykj6' className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p id='onboarding-presentation-sections-marketing-section-text-20-5ptkbh'>{t('onboarding.marketing.noProducts')}</p>
                </div>
              ) : (
                <div id='onboarding-presentation-sections-marketing-section-div-21-kasxsf' className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {products.products.map((product) => (
                    <label
                      key={product.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-all',
                        marketing.featuredProductIds.includes(product.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border',
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

            <TabsContent id='onboarding-presentation-sections-marketing-section-tabscontent-22-6lwhwx' value="coupons" className="space-y-6">
              <div id='onboarding-presentation-sections-marketing-section-div-23-rnwvyh' className="p-4 rounded-lg border space-y-4">
                <h4 id='onboarding-presentation-sections-marketing-section-heading-24-nvjmne' className="font-medium">{t('onboarding.marketing.createCoupon')}</h4>

                <div id='onboarding-presentation-sections-marketing-section-div-25-zsyqij' className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField id='onboarding-presentation-sections-marketing-section-formfield-26-xf6an8' label={t('onboarding.marketing.couponCode')} htmlFor='onboarding-presentation-sections-marketing-section-forminput-28-etsjoc'>
                    <div id='onboarding-presentation-sections-marketing-section-div-27-7udhka' className="flex gap-2">
                      <FormInput
                        id='onboarding-presentation-sections-marketing-section-forminput-28-etsjoc'
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                        className="font-mono uppercase"
                      />
                      <Button id='onboarding-presentation-sections-marketing-section-button-29-2tpauh'
                        variant="outline"
                        size="icon"
                        onClick={() => setNewCoupon({ ...newCoupon, code: generateCouponCode() })}
                      >
                        <Tag id='onboarding-presentation-sections-marketing-section-tag-30-d8sp8i' className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormField>

                  <FormField id='onboarding-presentation-sections-marketing-section-formfield-31-jrthwd' label={t('onboarding.marketing.discountType')} htmlFor="discountType">
                    <FormSelect id='onboarding-presentation-sections-marketing-section-formselect-32-lww73r'
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

                  <FormField id='onboarding-presentation-sections-marketing-section-formfield-33-qkvkuh' label={t('onboarding.marketing.discountValue')} htmlFor="discountValue">
                    <div id='onboarding-presentation-sections-marketing-section-div-34-ytzf5m' className="relative">
                      {newCoupon.discountType === 'percentage' ? (
                        <Percent id='onboarding-presentation-sections-marketing-section-percent-35-rw5njd' className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      ) : (
                        <DollarSign id='onboarding-presentation-sections-marketing-section-dollarsign-36-f0ljkf' className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                      <FormInput id='onboarding-presentation-sections-marketing-section-forminput-37-hxih7u'
                        type="number"
                        value={newCoupon.discountValue}
                        onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: parseFloat(e.target.value) || 0 })}
                        className="pl-9"
                        min={0}
                        max={newCoupon.discountType === 'percentage' ? 100 : undefined}
                      />
                    </div>
                  </FormField>

                  <FormField id='onboarding-presentation-sections-marketing-section-formfield-38-4rfboq' label={t('onboarding.marketing.minPurchase')} htmlFor="minPurchase">
                    <div id='onboarding-presentation-sections-marketing-section-div-39-pyo0p7' className="relative">
                      <DollarSign id='onboarding-presentation-sections-marketing-section-dollarsign-40-5f4nyb' className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormInput id='onboarding-presentation-sections-marketing-section-forminput-41-r6xfir'
                        type="number"
                        value={newCoupon.minPurchase}
                        onChange={(e) => setNewCoupon({ ...newCoupon, minPurchase: parseFloat(e.target.value) || 0 })}
                        className="pl-9"
                        min={0}
                      />
                    </div>
                  </FormField>
                </div>

                <Button id='onboarding-presentation-sections-marketing-section-button-42-md5pk7' onClick={addCoupon} className="gap-2">
                  <Plus id='onboarding-presentation-sections-marketing-section-plus-43-rpx2e6' className="h-4 w-4" />
                  {t('onboarding.marketing.createCouponBtn')}
                </Button>
              </div>

              {marketing.coupons.length > 0 && (
                <div id='onboarding-presentation-sections-marketing-section-div-44-hkoieu' className="space-y-2">
                  <h4 id='onboarding-presentation-sections-marketing-section-heading-45-finqoe' className="font-medium">{t('onboarding.marketing.activeCoupons')}</h4>
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

            <TabsContent id='onboarding-presentation-sections-marketing-section-tabscontent-46-clk8u6' value="campaigns" className="space-y-4">
              <div id='onboarding-presentation-sections-marketing-section-div-47-zhqk4l' className="text-center py-8 text-muted-foreground">
                <Calendar id='onboarding-presentation-sections-marketing-section-calendar-48-cevzsv' className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p id='onboarding-presentation-sections-marketing-section-text-49-sooac7'>{t('onboarding.marketing.campaignsDesc')}</p>
                <p id='onboarding-presentation-sections-marketing-section-text-50-di3zl5' className="text-sm mt-2">{t('onboarding.marketing.comingSoon')}</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <StepNavigation id='onboarding-presentation-sections-marketing-section-stepnavigation-51-pahr40' onNext={handleNext} />
    </div>
  );
}

export default MarketingSection;
