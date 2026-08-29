'use client';

import * as React from 'react';
import { Plus, X, Truck, DollarSign, MapPin } from 'lucide-react';
import { useOnboardingStore } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { FormField, FormInput, FormSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Switch } from '@/shared/ui/switch';
import { Label } from '@/shared/ui/label';
import type { ShippingMethod, ShippingProvider } from '@/features/onboarding/domain/types';
import { nextSellerId } from '@/features/onboarding/domain/next-id';
import { SHIPPING_ICONS, SHIPPING_PROVIDERS } from './shipping-section-model';
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.7-SrP39H", id: "onboarding.sections.shipping-section.div.7" })} id="onboarding.sections.shipping-section.div" className="space-y-6 animate-in fade-in duration-300">
      <Card ui={{ uid: "onboarding.sections.shipping-section.card.3-1qKwY3", id: "onboarding.sections.shipping-section.card.3" }} id="onboarding.sections.shipping-section.card">
        <CardHeader ui={{ uid: "onboarding.sections.shipping-section.card-header.3-vpFGM3", id: "onboarding.sections.shipping-section.card-header.3" }} id="onboarding.sections.shipping-section.card-header">
          <CardTitle ui={{ uid: "onboarding.sections.shipping-section.card-title.3-BsaT7F", id: "onboarding.sections.shipping-section.card-title.3" }} id="onboarding.sections.shipping-section.card-title" className="flex items-center gap-2">
            <Truck id="onboarding.sections.shipping-section.truck" className="h-5 w-5" />
            {t('onboarding.shipping.title')}
          </CardTitle>
          <CardDescription ui={{ uid: "onboarding.sections.shipping-section.card-description.3-6ezkOU", id: "onboarding.sections.shipping-section.card-description.3" }} id="onboarding.sections.shipping-section.card-description">{t('onboarding.shipping.description')}</CardDescription>
        </CardHeader>
        <CardContent ui={{ uid: "onboarding.sections.shipping-section.card-content.3-5wI2zk", id: "onboarding.sections.shipping-section.card-content.3" }} id="onboarding.sections.shipping-section.card-content" className="space-y-6">
          {errors.methods && (
            <p {...uiAttributes({ uid: "onboarding.sections.shipping-section.p.4-QjgD2a", id: "onboarding.sections.shipping-section.p.4" })} id="onboarding.sections.shipping-section.p" className="text-sm text-destructive">{errors.methods}</p>
          )}

          {shipping.methods.length === 0 ? (
            <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.8-ri8UDA", id: "onboarding.sections.shipping-section.div.8" })} id="onboarding.sections.shipping-section.div.2" className="flex flex-col items-center justify-center py-8 text-center">
              <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.9-OZY3lS", id: "onboarding.sections.shipping-section.div.9" })} id="onboarding.sections.shipping-section.div.3" className="rounded-full bg-muted p-4 mb-4">
                <Truck id="onboarding.sections.shipping-section.truck.2" className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 {...uiAttributes({ uid: "onboarding.sections.shipping-section.h3.2-Yz9E2L", id: "onboarding.sections.shipping-section.h3.2" })} id="onboarding.sections.shipping-section.h3" className="font-medium mb-2">{t('onboarding.shipping.emptyTitle')}</h3>
              <p {...uiAttributes({ uid: "onboarding.sections.shipping-section.p.5-yP55Jj", id: "onboarding.sections.shipping-section.p.5" })} id="onboarding.sections.shipping-section.p.2" className="text-sm text-muted-foreground mb-4">
                {t('onboarding.shipping.emptyDesc')}
              </p>
              <Button id="onboarding.sections.shipping-section.button" ui={{ uid: 'onboarding.shipping.add-method-TV9Fq2', id: 'onboarding.shipping.add-method', kind: 'action', action: 'add-shipping-method', part: 'empty-state' }} onClick={addShippingMethod} className="gap-2">
                <Plus id="onboarding.sections.shipping-section.plus" className="h-4 w-4" />
                {t('onboarding.shipping.addMethod')}
              </Button>
            </div>
          ) : (
            <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.10-nkQMY4", id: "onboarding.sections.shipping-section.div.10" })} id="onboarding.sections.shipping-section.div.4" className="space-y-4">
              {shipping.methods.map((method) => (
                <div
                  key={method.id} {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.11-YevUG5", id: "onboarding.sections.shipping-section.div.11" })}
                  className="p-4 rounded-lg border space-y-4 animate-in slide-in-from-top-2 duration-200"
                >
                  <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.12-2oKVjR", id: "onboarding.sections.shipping-section.div.12" })} className="flex items-start justify-between">
                    <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.13-54WA5W", id: "onboarding.sections.shipping-section.div.13" })} className="flex items-center gap-3">
                      <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.14-bbDL9y", id: "onboarding.sections.shipping-section.div.14" })} className="text-2xl">
                        {shippingProviderOptions.find((p) => p.value === method.provider)?.icon || '📦'}
                      </div>
                      <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.15-1mjlO3", id: "onboarding.sections.shipping-section.div.15" })}>
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
                    <Button ui={{ uid: "onboarding.sections.shipping-section.button.3-VVo9HX", id: "onboarding.sections.shipping-section.button.3" }}
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMethod(method.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.16-Yt7dPb", id: "onboarding.sections.shipping-section.div.16" })} className="grid gap-4 sm:grid-cols-3">
                    <FormField label={t('onboarding.shipping.deliveryTime')} htmlFor={`delivery-${method.id}`}>
                      <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.17-l8Y8N8", id: "onboarding.sections.shipping-section.div.17" })} className="flex items-center gap-2">
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
                        <span {...uiAttributes({ uid: "onboarding.sections.shipping-section.span-x0FEEV", id: "onboarding.sections.shipping-section.span" })} className="text-muted-foreground">{t('onboarding.common.to')}</span>
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
                        <span {...uiAttributes({ uid: "onboarding.sections.shipping-section.span.2-U6b5GU", id: "onboarding.sections.shipping-section.span.2" })} className="text-muted-foreground">{t('onboarding.common.days')}</span>
                      </div>
                    </FormField>

                    <FormField label={t('onboarding.shipping.shippingFee')} htmlFor={`fee-${method.id}`}>
                      <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.18-93K7ZA", id: "onboarding.sections.shipping-section.div.18" })} className="relative">
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
                      <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.19-B0IdUB", id: "onboarding.sections.shipping-section.div.19" })} className="relative">
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

              <Button id="onboarding.sections.shipping-section.button.2" ui={{ uid: 'onboarding.shipping.add-another-method-vX8VJ3', id: 'onboarding.shipping.add-another-method', kind: 'action', action: 'add-shipping-method', part: 'list-footer' }} variant="outline" onClick={addShippingMethod} className="w-full gap-2">
                <Plus id="onboarding.sections.shipping-section.plus.2" className="h-4 w-4" />
                {t('onboarding.shipping.addAnother')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card ui={{ uid: "onboarding.sections.shipping-section.card.4-07QGav", id: "onboarding.sections.shipping-section.card.4" }} id="onboarding.sections.shipping-section.card.2">
        <CardHeader ui={{ uid: "onboarding.sections.shipping-section.card-header.4-QENgI6", id: "onboarding.sections.shipping-section.card-header.4" }} id="onboarding.sections.shipping-section.card-header.2">
          <CardTitle ui={{ uid: "onboarding.sections.shipping-section.card-title.4-IhCQ7f", id: "onboarding.sections.shipping-section.card-title.4" }} id="onboarding.sections.shipping-section.card-title.2" className="flex items-center gap-2">
            <MapPin id="onboarding.sections.shipping-section.map-pin" className="h-5 w-5" />
            {t('onboarding.shipping.pickupTitle')}
          </CardTitle>
          <CardDescription ui={{ uid: "onboarding.sections.shipping-section.card-description.4-XvV7Cw", id: "onboarding.sections.shipping-section.card-description.4" }} id="onboarding.sections.shipping-section.card-description.2">{t('onboarding.shipping.pickupDesc')}</CardDescription>
        </CardHeader>
        <CardContent ui={{ uid: "onboarding.sections.shipping-section.card-content.4-G6xEBN", id: "onboarding.sections.shipping-section.card-content.4" }} id="onboarding.sections.shipping-section.card-content.2" className="space-y-4">
          <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.20-npF4IO", id: "onboarding.sections.shipping-section.div.20" })} id="onboarding.sections.shipping-section.div.5" className="flex items-center justify-between">
            <div {...uiAttributes({ uid: "onboarding.sections.shipping-section.div.21-elZQR8", id: "onboarding.sections.shipping-section.div.21" })} id="onboarding.sections.shipping-section.div.6">
              <Label ui={{ uid: "onboarding.sections.shipping-section.label.2-MEbjq4", id: "onboarding.sections.shipping-section.label.2" }} id="onboarding.sections.shipping-section.label">{t('onboarding.shipping.enablePickup')}</Label>
              <p {...uiAttributes({ uid: "onboarding.sections.shipping-section.p.6-piBJ00", id: "onboarding.sections.shipping-section.p.6" })} id="onboarding.sections.shipping-section.p.3" className="text-sm text-muted-foreground">
                {t('onboarding.shipping.enablePickupDesc')}
              </p>
            </div>
            <Switch id="onboarding.sections.shipping-section.switch" ui={{ uid: 'onboarding.shipping.pickup-available-Ba96gu', id: 'onboarding.shipping.pickup-available', kind: 'field', action: 'toggle-pickup', part: 'pickup' }}
              checked={shipping.pickupAvailable}
              onCheckedChange={(checked) => updateShipping({ pickupAvailable: checked })}
            />
          </div>

          {shipping.pickupAvailable && (
            <FormField id="onboarding.sections.shipping-section.form-field" label={t('onboarding.shipping.pickupAddress')} htmlFor="pickupAddress">
              <FormInput ui={{ uid: 'onboarding.shipping.pickup-address-9lRiBD', id: 'onboarding.shipping.pickup-address', kind: 'field', part: 'form' }}
                id="pickupAddress"
                value={shipping.pickupAddress}
                onChange={(e) => updateShipping({ pickupAddress: e.target.value })}
                placeholder={t('onboarding.shipping.pickupPlaceholder')}
              />
            </FormField>
          )}
        </CardContent>
      </Card>

      <StepNavigation id="onboarding.sections.shipping-section.step-navigation" onNext={handleNext} showSkip />
    </div>
  );
}

export default ShippingSection;
