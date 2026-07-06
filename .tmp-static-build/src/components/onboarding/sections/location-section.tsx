'use client';

import * as React from 'react';
import { Globe } from 'lucide-react';
import { useOnboardingStore, constants } from '@/lib/onboarding';
import { useTranslation } from '@/lib/i18n';
import { FormField, FormInput, FormSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const COUNTRY_KEYS: Record<string, string> = {
  'United States': 'unitedStates',
  'United Kingdom': 'unitedKingdom',
  Canada: 'canada',
  Australia: 'australia',
  Germany: 'germany',
  France: 'france',
  Italy: 'italy',
  Spain: 'spain',
  Netherlands: 'netherlands',
  Belgium: 'belgium',
  Switzerland: 'switzerland',
  Japan: 'japan',
  'South Korea': 'southKorea',
  Singapore: 'singapore',
  'United Arab Emirates': 'unitedArabEmirates',
};

export function LocationSection() {
  const { t } = useTranslation();
  const { data, updateLocation, markStepComplete } = useOnboardingStore();
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { location } = data;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!location.country) newErrors.country = t('onboarding.location.errors.countryRequired');
    if (!location.city.trim()) newErrors.city = t('onboarding.location.errors.cityRequired');
    if (!location.address.trim()) newErrors.address = t('onboarding.location.errors.addressRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      markStepComplete('location');
      return true;
    }
    return false;
  };

  const toggleShippingCountry = (country: string) => {
    const existing = location.shippingRegions.find((r) => r.country === country);
    if (existing) {
      updateLocation({
        shippingRegions: location.shippingRegions.filter((r) => r.country !== country),
      });
    } else {
      updateLocation({
        shippingRegions: [...location.shippingRegions, { country, regions: [], isAvailable: true }],
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle>{t('onboarding.location.title')}</CardTitle>
          <CardDescription>{t('onboarding.location.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <FormField label={t('onboarding.location.country')} htmlFor="country" required error={errors.country}>
              <FormSelect
                value={location.country}
                onValueChange={(v) => updateLocation({ country: v })}
                options={constants.countries.map((c) => ({
                  value: c,
                  label: t(`onboarding.constants.countries.${COUNTRY_KEYS[c]}`),
                }))}
                placeholder={t('onboarding.location.selectCountry')}
                error={errors.country}
              />
            </FormField>

            <FormField label={t('onboarding.location.city')} htmlFor="city" required error={errors.city}>
              <FormInput
                id="city"
                value={location.city}
                onChange={(e) => updateLocation({ city: e.target.value })}
                placeholder={t('onboarding.location.cityPlaceholder')}
                error={errors.city}
              />
            </FormField>
          </div>

          <FormField label={t('onboarding.location.address')} htmlFor="address" required error={errors.address}>
            <FormInput
              id="address"
              value={location.address}
              onChange={(e) => updateLocation({ address: e.target.value })}
              placeholder={t('onboarding.location.addressPlaceholder')}
              error={errors.address}
            />
          </FormField>

          <FormField label={t('onboarding.location.postalCode')} htmlFor="postalCode" hint={t('onboarding.common.optional')}>
            <FormInput
              id="postalCode"
              value={location.postalCode}
              onChange={(e) => updateLocation({ postalCode: e.target.value })}
              placeholder={t('onboarding.location.postalPlaceholder')}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('onboarding.location.shippingCountries')}
          </CardTitle>
          <CardDescription>{t('onboarding.location.shippingCountriesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {constants.countries.map((country) => {
              const isSelected = location.shippingRegions.some((r) => r.country === country);
              return (
                <label
                  key={country}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleShippingCountry(country)}
                  />
                  <span className="text-sm">
                    {t(`onboarding.constants.countries.${COUNTRY_KEYS[country]}`)}
                  </span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <StepNavigation onNext={handleNext} showSkip />
    </div>
  );
}

export default LocationSection;
