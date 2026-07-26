'use client';

import * as React from 'react';
import { Plus, X, Truck, DollarSign, MapPin } from 'lucide-react';
import { useOnboardingStore } from '@/lib/onboarding';
import { useTranslation } from '@/lib/i18n';
import { FormField, FormInput, FormSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { ShippingMethod, ShippingProvider } from '@/lib/onboarding/types';
import { nextSellerId } from '@/lib/seller/next-id';

const SHIPPING_PROVIDERS: ShippingProvider[] = [
  'standard',
  'express',
  'same_day',
  'international',
];

const SHIPPING_ICONS: Record<ShippingProvider, string> = {
  standard: '📦',
  express: '🚀',
  same_day: '⚡',
  international: '✈️',
  pickup: '🏪',
};

export function ShippingSection() {
  const { t } = useTranslation();
  const { data, updateShipping, markStepComplete } = useOnboardingStore();
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { shipping } = data;

  const shippingProviderOptions = React.useMemo(
    () =>
      SHIPPING_PROVIDERS.map((value) => ({
        value,
        label: t(`onboarding.shipping.providers.${value}`),
        icon: SHIPPING_ICONS[value],
      })),
    [t],
  );

  const validate = () => {
    if (shipping.methods.length === 0 && !shipping.pickupAvailable) {
      setErrors({ methods: t('onboarding.shipping.errors.methodRequired') });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (validate()) {
      markStepComplete('shipping');
      return true;
    }
    return false;
  };

  const addShippingMethod = () => {
    const newMethod: ShippingMethod = {
      id: nextSellerId('method'),
      provider: 'standard',
      name: t('onboarding.shipping.providers.standard'),
      deliveryDays: { min: 3, max: 7 },
      fee: 0,
      freeThreshold: null,
      isActive: true,
    };
    updateShipping({ methods: [...shipping.methods, newMethod] });
  };

  const updateMethod = (id: string, updates: Partial<ShippingMethod>) => {
    updateShipping({
      methods: shipping.methods.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    });
  };

  const removeMethod = (id: string) => {
    updateShipping({
      methods: shipping.methods.filter((m) => m.id !== id),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t('onboarding.shipping.title')}
          </CardTitle>
          <CardDescription>{t('onboarding.shipping.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errors.methods && (
            <p className="text-sm text-destructive">{errors.methods}</p>
          )}

          {shipping.methods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Truck className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">{t('onboarding.shipping.emptyTitle')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('onboarding.shipping.emptyDesc')}
              </p>
              <Button onClick={addShippingMethod} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('onboarding.shipping.addMethod')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {shipping.methods.map((method) => (
                <div
                  key={method.id}
                  className="p-4 rounded-lg border space-y-4 animate-in slide-in-from-top-2 duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {shippingProviderOptions.find((p) => p.value === method.provider)?.icon || '📦'}
                      </div>
                      <div>
                        <FormSelect
                          value={method.provider}
                          onValueChange={(v) => {
                            const provider = shippingProviderOptions.find((p) => p.value === v);
                            updateMethod(method.id, {
                              provider: v as ShippingProvider,
                              name: provider?.label || v,
                            });
                          }}
                          options={shippingProviderOptions.map((p) => ({
                            value: p.value,
                            label: p.label,
                          }))}
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMethod(method.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField label={t('onboarding.shipping.deliveryTime')} htmlFor={`delivery-${method.id}`}>
                      <div className="flex items-center gap-2">
                        <FormInput
                          type="number"
                          value={method.deliveryDays.min}
                          onChange={(e) =>
                            updateMethod(method.id, {
                              deliveryDays: { ...method.deliveryDays, min: parseInt(e.target.value) || 0 },
                            })
                          }
                          className="w-20"
                          min={0}
                        />
                        <span className="text-muted-foreground">{t('onboarding.common.to')}</span>
                        <FormInput
                          type="number"
                          value={method.deliveryDays.max}
                          onChange={(e) =>
                            updateMethod(method.id, {
                              deliveryDays: { ...method.deliveryDays, max: parseInt(e.target.value) || 0 },
                            })
                          }
                          className="w-20"
                          min={0}
                        />
                        <span className="text-muted-foreground">{t('onboarding.common.days')}</span>
                      </div>
                    </FormField>

                    <FormField label={t('onboarding.shipping.shippingFee')} htmlFor={`fee-${method.id}`}>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormInput
                          type="number"
                          value={method.fee}
                          onChange={(e) => updateMethod(method.id, { fee: parseFloat(e.target.value) || 0 })}
                          className="pl-9"
                          min={0}
                          step={0.01}
                        />
                      </div>
                    </FormField>

                    <FormField label={t('onboarding.shipping.freeOver')} htmlFor={`threshold-${method.id}`} hint={t('onboarding.common.optional')}>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormInput
                          type="number"
                          value={method.freeThreshold || ''}
                          onChange={(e) =>
                            updateMethod(method.id, {
                              freeThreshold: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="pl-9"
                          placeholder={t('onboarding.common.noMinimum')}
                          min={0}
                          step={0.01}
                        />
                      </div>
                    </FormField>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addShippingMethod} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                {t('onboarding.shipping.addAnother')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('onboarding.shipping.pickupTitle')}
          </CardTitle>
          <CardDescription>{t('onboarding.shipping.pickupDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('onboarding.shipping.enablePickup')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.shipping.enablePickupDesc')}
              </p>
            </div>
            <Switch
              checked={shipping.pickupAvailable}
              onCheckedChange={(checked) => updateShipping({ pickupAvailable: checked })}
            />
          </div>

          {shipping.pickupAvailable && (
            <FormField label={t('onboarding.shipping.pickupAddress')} htmlFor="pickupAddress">
              <FormInput
                id="pickupAddress"
                value={shipping.pickupAddress}
                onChange={(e) => updateShipping({ pickupAddress: e.target.value })}
                placeholder={t('onboarding.shipping.pickupPlaceholder')}
              />
            </FormField>
          )}
        </CardContent>
      </Card>

      <StepNavigation onNext={handleNext} showSkip />
    </div>
  );
}

export default ShippingSection;
