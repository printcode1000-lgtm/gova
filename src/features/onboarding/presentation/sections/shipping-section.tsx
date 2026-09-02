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
    <div id='onboarding-presentation-sections-shipping-section-div-1-8oofyo' className="space-y-6 animate-in fade-in duration-300">
      <Card id='onboarding-presentation-sections-shipping-section-card-2-heupuh'>
        <CardHeader id='onboarding-presentation-sections-shipping-section-cardheader-3-r14kus'>
          <CardTitle id='onboarding-presentation-sections-shipping-section-cardtitle-4-rckimp' className="flex items-center gap-2">
            <Truck id='onboarding-presentation-sections-shipping-section-truck-5-62bdhv' className="h-5 w-5" />
            {t('onboarding.shipping.title')}
          </CardTitle>
          <CardDescription id='onboarding-presentation-sections-shipping-section-carddescription-6-o8t0wd'>{t('onboarding.shipping.description')}</CardDescription>
        </CardHeader>
        <CardContent id='onboarding-presentation-sections-shipping-section-cardcontent-7-hs0fxu' className="space-y-6">
          {errors.methods && (
            <p id='onboarding-presentation-sections-shipping-section-text-8-g48o5g' className="text-sm text-destructive">{errors.methods}</p>
          )}

          {shipping.methods.length === 0 ? (
            <div id='onboarding-presentation-sections-shipping-section-div-9-ja0xdi' className="flex flex-col items-center justify-center py-8 text-center">
              <div id='onboarding-presentation-sections-shipping-section-div-10-cmimho' className="rounded-full bg-muted p-4 mb-4">
                <Truck id='onboarding-presentation-sections-shipping-section-truck-11-vi3plp' className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 id='onboarding-presentation-sections-shipping-section-heading-12-dz7cob' className="font-medium mb-2">{t('onboarding.shipping.emptyTitle')}</h3>
              <p id='onboarding-presentation-sections-shipping-section-text-13-z5nmai' className="text-sm text-muted-foreground mb-4">
                {t('onboarding.shipping.emptyDesc')}
              </p>
              <Button id='onboarding-presentation-sections-shipping-section-button-14-61ki4w' onClick={addShippingMethod} className="gap-2">
                <Plus id='onboarding-presentation-sections-shipping-section-plus-15-fl0jo4' className="h-4 w-4" />
                {t('onboarding.shipping.addMethod')}
              </Button>
            </div>
          ) : (
            <div id='onboarding-presentation-sections-shipping-section-div-16-awuuq0' className="space-y-4">
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

              <Button id='onboarding-presentation-sections-shipping-section-button-17-0riash' variant="outline" onClick={addShippingMethod} className="w-full gap-2">
                <Plus id='onboarding-presentation-sections-shipping-section-plus-18-efbaz8' className="h-4 w-4" />
                {t('onboarding.shipping.addAnother')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id='onboarding-presentation-sections-shipping-section-card-19-acnzfx'>
        <CardHeader id='onboarding-presentation-sections-shipping-section-cardheader-20-4jveth'>
          <CardTitle id='onboarding-presentation-sections-shipping-section-cardtitle-21-uwvwpq' className="flex items-center gap-2">
            <MapPin id='onboarding-presentation-sections-shipping-section-mappin-22-hvc5fd' className="h-5 w-5" />
            {t('onboarding.shipping.pickupTitle')}
          </CardTitle>
          <CardDescription id='onboarding-presentation-sections-shipping-section-carddescription-23-arojyd'>{t('onboarding.shipping.pickupDesc')}</CardDescription>
        </CardHeader>
        <CardContent id='onboarding-presentation-sections-shipping-section-cardcontent-24-hdmadl' className="space-y-4">
          <div id='onboarding-presentation-sections-shipping-section-div-25-9ppuwz' className="flex items-center justify-between">
            <div id='onboarding-presentation-sections-shipping-section-div-26-hget38'>
              <Label id='onboarding-presentation-sections-shipping-section-label-27-d9euuw'>{t('onboarding.shipping.enablePickup')}</Label>
              <p id='onboarding-presentation-sections-shipping-section-text-28-jz5ijg' className="text-sm text-muted-foreground">
                {t('onboarding.shipping.enablePickupDesc')}
              </p>
            </div>
            <Switch id='onboarding-presentation-sections-shipping-section-switch-29-hggnkq'
              checked={shipping.pickupAvailable}
              onCheckedChange={(checked) => updateShipping({ pickupAvailable: checked })}
            />
          </div>

          {shipping.pickupAvailable && (
            <FormField id='onboarding-presentation-sections-shipping-section-formfield-30-fq8mt3' label={t('onboarding.shipping.pickupAddress')} htmlFor='onboarding-presentation-sections-shipping-section-forminput-31-9g4uzo'>
              <FormInput
                id='onboarding-presentation-sections-shipping-section-forminput-31-9g4uzo'
                value={shipping.pickupAddress}
                onChange={(e) => updateShipping({ pickupAddress: e.target.value })}
                placeholder={t('onboarding.shipping.pickupPlaceholder')}
              />
            </FormField>
          )}
        </CardContent>
      </Card>

      <StepNavigation id='onboarding-presentation-sections-shipping-section-stepnavigation-32-lxstrj' onNext={handleNext} showSkip />
    </div>
  );
}

export default ShippingSection;
