'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { useOnboardingStore } from '@/lib/onboarding';
import { useTranslation } from '@/lib/i18n';
import { FormField, FormInput } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const SOCIAL_PLATFORMS = [
  'instagram',
  'facebook',
  'twitter',
  'tiktok',
  'youtube',
  'pinterest',
] as const;

export function ContactInfoSection() {
  const { t } = useTranslation();
  const { data, updateContactInfo, markStepComplete } = useOnboardingStore();
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { contactInfo } = data;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!contactInfo.phoneNumber.trim()) {
      newErrors.phoneNumber = t('onboarding.contactInfo.errors.phoneRequired');
    }
    if (!contactInfo.email.trim()) {
      newErrors.email = t('onboarding.contactInfo.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email)) {
      newErrors.email = t('onboarding.contactInfo.errors.emailInvalid');
    }
    if (contactInfo.website && !/^https?:\/\/.+\..+/.test(contactInfo.website)) {
      newErrors.website = t('onboarding.contactInfo.errors.websiteInvalid');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      markStepComplete('contact-info');
      return true;
    }
    return false;
  };

  const addSocialLink = (platform: string) => {
    const exists = contactInfo.socialLinks.find((s) => s.platform === platform);
    if (exists) return;
    updateContactInfo({
      socialLinks: [...contactInfo.socialLinks, { platform, url: '' }],
    });
  };

  const updateSocialLink = (platform: string, updates: { url?: string }) => {
    updateContactInfo({
      socialLinks: contactInfo.socialLinks.map((s) =>
        s.platform === platform ? { ...s, ...updates } : s,
      ),
    });
  };

  const removeSocialLink = (platform: string) => {
    updateContactInfo({
      socialLinks: contactInfo.socialLinks.filter((s) => s.platform !== platform),
    });
  };

  const addedPlatforms = contactInfo.socialLinks.map((s) => s.platform);
  const availablePlatforms = SOCIAL_PLATFORMS.filter((p) => !addedPlatforms.includes(p));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle>{t('onboarding.contactInfo.title')}</CardTitle>
          <CardDescription>{t('onboarding.contactInfo.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <FormField label={t('onboarding.contactInfo.phoneNumber')} htmlFor="phoneNumber" required error={errors.phoneNumber}>
              <FormInput
                id="phoneNumber"
                value={contactInfo.phoneNumber}
                onChange={(e) => updateContactInfo({ phoneNumber: e.target.value })}
                placeholder={t('onboarding.contactInfo.phonePlaceholder')}
                type="tel"
                error={errors.phoneNumber}
              />
            </FormField>

            <FormField label={t('onboarding.contactInfo.whatsappNumber')} htmlFor="whatsappNumber" hint={t('onboarding.common.optional')}>
              <FormInput
                id="whatsappNumber"
                value={contactInfo.whatsappNumber}
                onChange={(e) => updateContactInfo({ whatsappNumber: e.target.value })}
                placeholder={t('onboarding.contactInfo.phonePlaceholder')}
                type="tel"
              />
            </FormField>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <FormField label={t('onboarding.contactInfo.email')} htmlFor="email" required error={errors.email}>
              <FormInput
                id="email"
                value={contactInfo.email}
                onChange={(e) => updateContactInfo({ email: e.target.value })}
                placeholder={t('onboarding.contactInfo.emailPlaceholder')}
                type="email"
                error={errors.email}
              />
            </FormField>

            <FormField label={t('onboarding.contactInfo.website')} htmlFor="website" error={errors.website} hint={t('onboarding.common.optional')}>
              <FormInput
                id="website"
                value={contactInfo.website}
                onChange={(e) => updateContactInfo({ website: e.target.value })}
                placeholder={t('onboarding.contactInfo.websitePlaceholder')}
                type="url"
                error={errors.website}
              />
            </FormField>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{t('onboarding.contactInfo.socialLinks')}</Label>
                <p className="text-xs text-muted-foreground">{t('onboarding.contactInfo.socialHint')}</p>
              </div>
              {availablePlatforms.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {availablePlatforms.map((platform) => (
                    <Button
                      key={platform}
                      variant="outline"
                      size="sm"
                      onClick={() => addSocialLink(platform)}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      {t(`onboarding.contactInfo.platforms.${platform}`)}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {contactInfo.socialLinks.length > 0 && (
              <div className="space-y-3">
                {contactInfo.socialLinks.map((link) => (
                  <div key={link.platform} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">
                      {t(`onboarding.contactInfo.platforms.${link.platform}`)}
                    </span>
                    <div className="flex-1 flex gap-2">
                      <FormInput
                        value={link.url}
                        onChange={(e) => updateSocialLink(link.platform, { url: e.target.value })}
                        placeholder={t('onboarding.contactInfo.socialUrlPlaceholder')}
                        inputMode="url"
                        className="flex-1"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSocialLink(link.platform)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <StepNavigation onNext={handleNext} showSkip />
    </div>
  );
}

export default ContactInfoSection;
