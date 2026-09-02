'use client';

import * as React from 'react';
import { Globe } from 'lucide-react';
import { useOnboardingStore, constants } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { FormField, FormInput, FormSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { cn } from '@/shared/utils';

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
    <div id='onboarding-presentation-sections-location-section-div-1-orakgn' className="space-y-6 animate-in fade-in duration-300">
      <Card id='onboarding-presentation-sections-location-section-card-2-bswh6k'>
        <CardHeader id='onboarding-presentation-sections-location-section-cardheader-3-h0qimb'>
          <CardTitle id='onboarding-presentation-sections-location-section-cardtitle-4-parxbf'>{t('onboarding.location.title')}</CardTitle>
          <CardDescription id='onboarding-presentation-sections-location-section-carddescription-5-zzshal'>{t('onboarding.location.description')}</CardDescription>
        </CardHeader>
        <CardContent id='onboarding-presentation-sections-location-section-cardcontent-6-dy0dgg' className="space-y-6">
          <div id='onboarding-presentation-sections-location-section-div-7-5o4f8g' className="grid gap-6 lg:grid-cols-2">
            <FormField id='onboarding-presentation-sections-location-section-formfield-8-41khhf' label={t('onboarding.location.country')} htmlFor="country" required error={errors.country}>
              <FormSelect id='onboarding-presentation-sections-location-section-formselect-9-56knz6'
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

            <FormField id='onboarding-presentation-sections-location-section-formfield-10-xrvicd' label={t('onboarding.location.city')} htmlFor='onboarding-presentation-sections-location-section-forminput-11-qdwt4m' required error={errors.city}>
              <FormInput
                id='onboarding-presentation-sections-location-section-forminput-11-qdwt4m'
                value={location.city}
                onChange={(e) => updateLocation({ city: e.target.value })}
                placeholder={t('onboarding.location.cityPlaceholder')}
                error={errors.city}
              />
            </FormField>
          </div>

          <FormField id='onboarding-presentation-sections-location-section-formfield-12-sqxbcw' label={t('onboarding.location.address')} htmlFor='onboarding-presentation-sections-location-section-forminput-13-qbosrv' required error={errors.address}>
            <FormInput
              id='onboarding-presentation-sections-location-section-forminput-13-qbosrv'
              value={location.address}
              onChange={(e) => updateLocation({ address: e.target.value })}
              placeholder={t('onboarding.location.addressPlaceholder')}
              error={errors.address}
            />
          </FormField>

          <FormField id='onboarding-presentation-sections-location-section-formfield-14-d4eofz' label={t('onboarding.location.postalCode')} htmlFor='onboarding-presentation-sections-location-section-forminput-15-vncelb' hint={t('onboarding.common.optional')}>
            <FormInput
              id='onboarding-presentation-sections-location-section-forminput-15-vncelb'
              value={location.postalCode}
              onChange={(e) => updateLocation({ postalCode: e.target.value })}
              placeholder={t('onboarding.location.postalPlaceholder')}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card id='onboarding-presentation-sections-location-section-card-16-lc5yvc'>
        <CardHeader id='onboarding-presentation-sections-location-section-cardheader-17-wwaugn'>
          <CardTitle id='onboarding-presentation-sections-location-section-cardtitle-18-6svnl1' className="flex items-center gap-2">
            <Globe id='onboarding-presentation-sections-location-section-globe-19-3hdwsm' className="h-5 w-5" />
            {t('onboarding.location.shippingCountries')}
          </CardTitle>
          <CardDescription id='onboarding-presentation-sections-location-section-carddescription-20-f41nrc'>{t('onboarding.location.shippingCountriesDesc')}</CardDescription>
        </CardHeader>
        <CardContent id='onboarding-presentation-sections-location-section-cardcontent-21-k0q8ha'>
          <div id='onboarding-presentation-sections-location-section-div-22-0k6ycw' className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {constants.countries.map((country) => {
              const isSelected = location.shippingRegions.some((r) => r.country === country);
              return (
                <label
                  key={country}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border',
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

      <StepNavigation id='onboarding-presentation-sections-location-section-stepnavigation-23-uupctb' onNext={handleNext} showSkip />
    </div>
  );
}

export default LocationSection;
