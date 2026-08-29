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
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.13-H7o1I0", id: "onboarding.sections.marketing-section.div.13" })} id="onboarding.sections.marketing-section.div" className="space-y-6 animate-in fade-in duration-300">
      <Card ui={{ uid: "onboarding.sections.marketing-section.card.2-3C7WQH", id: "onboarding.sections.marketing-section.card.2" }} id="onboarding.sections.marketing-section.card">
        <CardHeader ui={{ uid: "onboarding.sections.marketing-section.card-header.2-ZOp4BI", id: "onboarding.sections.marketing-section.card-header.2" }} id="onboarding.sections.marketing-section.card-header">
          <CardTitle ui={{ uid: "onboarding.sections.marketing-section.card-title.2-EI7UJt", id: "onboarding.sections.marketing-section.card-title.2" }} id="onboarding.sections.marketing-section.card-title" className="flex items-center gap-2">
            <Megaphone id="onboarding.sections.marketing-section.megaphone" className="h-5 w-5" />
            {t('onboarding.marketing.title')}
          </CardTitle>
          <CardDescription ui={{ uid: "onboarding.sections.marketing-section.card-description.2-5N5y20", id: "onboarding.sections.marketing-section.card-description.2" }} id="onboarding.sections.marketing-section.card-description">{t('onboarding.marketing.description')}</CardDescription>
        </CardHeader>
        <CardContent ui={{ uid: "onboarding.sections.marketing-section.card-content.2-Udh8E7", id: "onboarding.sections.marketing-section.card-content.2" }} id="onboarding.sections.marketing-section.card-content">
          <Tabs defaultValue="featured" className="space-y-6">
            <TabsList ui={{ uid: "onboarding.sections.marketing-section.tabs-list.2-Q9Df5N", id: "onboarding.sections.marketing-section.tabs-list.2" }} id="onboarding.sections.marketing-section.tabs-list" className="grid w-full grid-cols-3">
              <TabsTrigger id="onboarding.sections.marketing-section.tabs-trigger" ui={{ uid: 'onboarding.marketing.tab-featured-i7Mrb4', id: 'onboarding.marketing.tab-featured', kind: 'action', action: 'select-featured-tab', part: 'tabs' }} value="featured">{t('onboarding.marketing.tabs.featured')}</TabsTrigger>
              <TabsTrigger id="onboarding.sections.marketing-section.tabs-trigger.2" ui={{ uid: 'onboarding.marketing.tab-coupons-R5QMnN', id: 'onboarding.marketing.tab-coupons', kind: 'action', action: 'select-coupons-tab', part: 'tabs' }} value="coupons">{t('onboarding.marketing.tabs.coupons')}</TabsTrigger>
              <TabsTrigger id="onboarding.sections.marketing-section.tabs-trigger.3" ui={{ uid: 'onboarding.marketing.tab-campaigns-bEX5BE', id: 'onboarding.marketing.tab-campaigns', kind: 'action', action: 'select-campaigns-tab', part: 'tabs' }} value="campaigns">{t('onboarding.marketing.tabs.campaigns')}</TabsTrigger>
            </TabsList>

            <TabsContent ui={{ uid: "onboarding.sections.marketing-section.tabs-content.4-VRRL9L", id: "onboarding.sections.marketing-section.tabs-content.4" }} id="onboarding.sections.marketing-section.tabs-content" value="featured" className="space-y-4">
              <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.14-y92MH6", id: "onboarding.sections.marketing-section.div.14" })} id="onboarding.sections.marketing-section.div.2" className="flex items-center justify-between">
                <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.15-JTdeF4", id: "onboarding.sections.marketing-section.div.15" })} id="onboarding.sections.marketing-section.div.3">
                  <Label ui={{ uid: "onboarding.sections.marketing-section.label.3-2W2CIz", id: "onboarding.sections.marketing-section.label.3" }} id="onboarding.sections.marketing-section.label" className="font-medium">{t('onboarding.marketing.featuredTitle')}</Label>
                  <p {...uiAttributes({ uid: "onboarding.sections.marketing-section.p.5-MeZg4Q", id: "onboarding.sections.marketing-section.p.5" })} id="onboarding.sections.marketing-section.p" className="text-sm text-muted-foreground">
                    {t('onboarding.marketing.featuredDesc')}
                  </p>
                </div>
                <Badge ui={{ uid: "onboarding.sections.marketing-section.badge.2-yAN1JP", id: "onboarding.sections.marketing-section.badge.2" }} id="onboarding.sections.marketing-section.badge" variant="secondary">
                  {t('onboarding.common.selected', { count: marketing.featuredProductIds.length })}
                </Badge>
              </div>

              {products.products.length === 0 ? (
                <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.16-mOL7kw", id: "onboarding.sections.marketing-section.div.16" })} id="onboarding.sections.marketing-section.div.4" className="text-center py-8 text-muted-foreground">
                  <Tag id="onboarding.sections.marketing-section.tag" className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p {...uiAttributes({ uid: "onboarding.sections.marketing-section.p.6-3r1iX1", id: "onboarding.sections.marketing-section.p.6" })} id="onboarding.sections.marketing-section.p.2">{t('onboarding.marketing.noProducts')}</p>
                </div>
              ) : (
                <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.17-W7SqAI", id: "onboarding.sections.marketing-section.div.17" })} id="onboarding.sections.marketing-section.div.5" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {products.products.map((product) => (
                    <label
                      key={product.id} {...uiAttributes({ uid: "onboarding.sections.marketing-section.label.2-pKnTf9", id: "onboarding.sections.marketing-section.label.2" })}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-all',
                        marketing.featuredProductIds.includes(product.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border',
                      )}
                    >
                      <input {...uiAttributes({ uid: "onboarding.sections.marketing-section.input-xLKDT3", id: "onboarding.sections.marketing-section.input" })}
                        type="checkbox"
                        checked={marketing.featuredProductIds.includes(product.id)}
                        onChange={() => toggleFeaturedProduct(product.id)}
                        disabled={
                          !marketing.featuredProductIds.includes(product.id) &&
                          marketing.featuredProductIds.length >= 6
                        }
                        className="rounded border-gray-300"
                      />
                      <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.18-U7LBxe", id: "onboarding.sections.marketing-section.div.18" })} className="flex-1 min-w-0">
                        <p {...uiAttributes({ uid: "onboarding.sections.marketing-section.p.7-jKMXv5", id: "onboarding.sections.marketing-section.p.7" })} className="text-sm font-medium truncate">{product.title}</p>
                        <p {...uiAttributes({ uid: "onboarding.sections.marketing-section.p.8-WFQEs5", id: "onboarding.sections.marketing-section.p.8" })} className="text-xs text-muted-foreground">${product.basePrice.toFixed(2)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent ui={{ uid: "onboarding.sections.marketing-section.tabs-content.5-9wReWr", id: "onboarding.sections.marketing-section.tabs-content.5" }} id="onboarding.sections.marketing-section.tabs-content.2" value="coupons" className="space-y-6">
              <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.19-Eu7q2P", id: "onboarding.sections.marketing-section.div.19" })} id="onboarding.sections.marketing-section.div.6" className="p-4 rounded-lg border space-y-4">
                <h4 {...uiAttributes({ uid: "onboarding.sections.marketing-section.h4.3-691sBQ", id: "onboarding.sections.marketing-section.h4.3" })} id="onboarding.sections.marketing-section.h4" className="font-medium">{t('onboarding.marketing.createCoupon')}</h4>

                <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.20-RG0RH1", id: "onboarding.sections.marketing-section.div.20" })} id="onboarding.sections.marketing-section.div.7" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField id="onboarding.sections.marketing-section.form-field" label={t('onboarding.marketing.couponCode')} htmlFor="couponCode">
                    <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.21-iJ1H3O", id: "onboarding.sections.marketing-section.div.21" })} id="onboarding.sections.marketing-section.div.8" className="flex gap-2">
                      <FormInput ui={{ uid: 'onboarding.marketing.coupon-code-3IOCSi', id: 'onboarding.marketing.coupon-code', kind: 'field', part: 'coupon-form' }}
                        id="couponCode"
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                        className="font-mono uppercase"
                      />
                      <Button id="onboarding.sections.marketing-section.button" ui={{ uid: 'onboarding.marketing.generate-coupon-code-e3kMcV', id: 'onboarding.marketing.generate-coupon-code', kind: 'action', action: 'generate-coupon-code', part: 'coupon-form' }}
                        variant="outline"
                        size="icon"
                        onClick={() => setNewCoupon({ ...newCoupon, code: generateCouponCode() })}
                      >
                        <Tag id="onboarding.sections.marketing-section.tag.2" className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormField>

                  <FormField id="onboarding.sections.marketing-section.form-field.2" label={t('onboarding.marketing.discountType')} htmlFor="discountType">
                    <FormSelect id="onboarding.sections.marketing-section.form-select" ui={{ uid: 'onboarding.marketing.coupon-discount-type-62gFeq', id: 'onboarding.marketing.coupon-discount-type', kind: 'field', part: 'coupon-form' }}
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

                  <FormField id="onboarding.sections.marketing-section.form-field.3" label={t('onboarding.marketing.discountValue')} htmlFor="discountValue">
                    <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.22-s7Z8Xh", id: "onboarding.sections.marketing-section.div.22" })} id="onboarding.sections.marketing-section.div.9" className="relative">
                      {newCoupon.discountType === 'percentage' ? (
                        <Percent id="onboarding.sections.marketing-section.percent" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      ) : (
                        <DollarSign id="onboarding.sections.marketing-section.dollar-sign" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                      <FormInput id="onboarding.sections.marketing-section.form-input" ui={{ uid: 'onboarding.marketing.coupon-discount-value-mqXVQ7', id: 'onboarding.marketing.coupon-discount-value', kind: 'field', part: 'coupon-form' }}
                        type="number"
                        value={newCoupon.discountValue}
                        onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: parseFloat(e.target.value) || 0 })}
                        className="pl-9"
                        min={0}
                        max={newCoupon.discountType === 'percentage' ? 100 : undefined}
                      />
                    </div>
                  </FormField>

                  <FormField id="onboarding.sections.marketing-section.form-field.4" label={t('onboarding.marketing.minPurchase')} htmlFor="minPurchase">
                    <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.23-8fByVO", id: "onboarding.sections.marketing-section.div.23" })} id="onboarding.sections.marketing-section.div.10" className="relative">
                      <DollarSign id="onboarding.sections.marketing-section.dollar-sign.2" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormInput id="onboarding.sections.marketing-section.form-input.2" ui={{ uid: 'onboarding.marketing.coupon-min-purchase-Ys8aoF', id: 'onboarding.marketing.coupon-min-purchase', kind: 'field', part: 'coupon-form' }}
                        type="number"
                        value={newCoupon.minPurchase}
                        onChange={(e) => setNewCoupon({ ...newCoupon, minPurchase: parseFloat(e.target.value) || 0 })}
                        className="pl-9"
                        min={0}
                      />
                    </div>
                  </FormField>
                </div>

                <Button id="onboarding.sections.marketing-section.button.2" ui={{ uid: 'onboarding.marketing.add-coupon-4HY99G', id: 'onboarding.marketing.add-coupon', kind: 'action', action: 'add-coupon', part: 'coupon-form' }} onClick={addCoupon} className="gap-2">
                  <Plus id="onboarding.sections.marketing-section.plus" className="h-4 w-4" />
                  {t('onboarding.marketing.createCouponBtn')}
                </Button>
              </div>

              {marketing.coupons.length > 0 && (
                <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.24-iZ04Aq", id: "onboarding.sections.marketing-section.div.24" })} id="onboarding.sections.marketing-section.div.11" className="space-y-2">
                  <h4 {...uiAttributes({ uid: "onboarding.sections.marketing-section.h4.4-nPa06a", id: "onboarding.sections.marketing-section.h4.4" })} id="onboarding.sections.marketing-section.h4.2" className="font-medium">{t('onboarding.marketing.activeCoupons')}</h4>
                  {marketing.coupons.map((coupon) => (
                    <div
                      key={coupon.id} {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.25-YWuj8O", id: "onboarding.sections.marketing-section.div.25" })}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.26-gR2PYH", id: "onboarding.sections.marketing-section.div.26" })} className="flex items-center gap-3">
                        <code {...uiAttributes({ uid: "onboarding.sections.marketing-section.code-rcu53H", id: "onboarding.sections.marketing-section.code" })} className="px-2 py-1 rounded bg-muted font-mono text-sm">
                          {coupon.code}
                        </code>
                        <Badge ui={{ uid: "onboarding.sections.marketing-section.badge.3-QFL2P0", id: "onboarding.sections.marketing-section.badge.3" }} variant="secondary">
                          {coupon.discountType === 'percentage'
                            ? t('onboarding.marketing.percentOff', { value: coupon.discountValue })
                            : t('onboarding.marketing.amountOff', { value: coupon.discountValue })}
                        </Badge>
                      </div>
                      <Button ui={{ uid: "onboarding.sections.marketing-section.button.3-l3LHRd", id: "onboarding.sections.marketing-section.button.3" }} variant="ghost" size="icon" onClick={() => removeCoupon(coupon.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent ui={{ uid: "onboarding.sections.marketing-section.tabs-content.6-qZ7CQe", id: "onboarding.sections.marketing-section.tabs-content.6" }} id="onboarding.sections.marketing-section.tabs-content.3" value="campaigns" className="space-y-4">
              <div {...uiAttributes({ uid: "onboarding.sections.marketing-section.div.27-aT6OBt", id: "onboarding.sections.marketing-section.div.27" })} id="onboarding.sections.marketing-section.div.12" className="text-center py-8 text-muted-foreground">
                <Calendar id="onboarding.sections.marketing-section.calendar" className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p {...uiAttributes({ uid: "onboarding.sections.marketing-section.p.9-8CdPsY", id: "onboarding.sections.marketing-section.p.9" })} id="onboarding.sections.marketing-section.p.3">{t('onboarding.marketing.campaignsDesc')}</p>
                <p {...uiAttributes({ uid: "onboarding.sections.marketing-section.p.10-34bB3y", id: "onboarding.sections.marketing-section.p.10" })} id="onboarding.sections.marketing-section.p.4" className="text-sm mt-2">{t('onboarding.marketing.comingSoon')}</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <StepNavigation id="onboarding.sections.marketing-section.step-navigation" onNext={handleNext} />
    </div>
  );
}

export default MarketingSection;
