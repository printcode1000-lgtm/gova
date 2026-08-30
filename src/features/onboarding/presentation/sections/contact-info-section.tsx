'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { useOnboardingStore } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { FormField, FormInput } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { PhoneField } from '@/shared/ui/phone-field';
import { phoneFieldLabels } from '@/shared/phone/phone-field-labels';
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

const SOCIAL_PLATFORMS = [
  'instagram',
  'facebook',
  'twitter',
  'tiktok',
  'youtube',
  'pinterest',
] as const;

export function ContactInfoSection() {
  const { t, locale } = useTranslation();
  const phoneLabels = phoneFieldLabels(t, locale);
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
    <div {...uiAttributes({ uid: "onboarding.sections.contact-info-section.div.9-qVnr6A", id: "onboarding.sections.contact-info-section.div.9" })} id="onboarding.sections.contact-info-section.div" className="space-y-6 animate-in fade-in duration-300">
      <Card ui={{ uid: "onboarding.sections.contact-info-section.card.2-zWM47F", id: "onboarding.sections.contact-info-section.card.2" }} id="onboarding.sections.contact-info-section.card">
        <CardHeader ui={{ uid: "onboarding.sections.contact-info-section.card-header.2-j6D4BV", id: "onboarding.sections.contact-info-section.card-header.2" }} id="onboarding.sections.contact-info-section.card-header">
          <CardTitle ui={{ uid: "onboarding.sections.contact-info-section.card-title.2-dS4A6N", id: "onboarding.sections.contact-info-section.card-title.2" }} id="onboarding.sections.contact-info-section.card-title">{t('onboarding.contactInfo.title')}</CardTitle>
          <CardDescription ui={{ uid: "onboarding.sections.contact-info-section.card-description.2-P7VumB", id: "onboarding.sections.contact-info-section.card-description.2" }} id="onboarding.sections.contact-info-section.card-description">{t('onboarding.contactInfo.description')}</CardDescription>
        </CardHeader>
        <CardContent ui={{ uid: "onboarding.sections.contact-info-section.card-content.2-dZY1KM", id: "onboarding.sections.contact-info-section.card-content.2" }} id="onboarding.sections.contact-info-section.card-content" className="space-y-6">
          <div {...uiAttributes({ uid: "onboarding.sections.contact-info-section.div.10-vJXWB3", id: "onboarding.sections.contact-info-section.div.10" })} id="onboarding.sections.contact-info-section.div.2" className="grid gap-6 lg:grid-cols-2">
            <FormField id="onboarding.sections.contact-info-section.form-field" label={t('onboarding.contactInfo.phoneNumber')} htmlFor="phoneNumber" required error={errors.phoneNumber}>
              <PhoneField id="onboarding.sections.contact-info-section.phone-field"
                ui={{ uid: 'onboarding.contact-info.phone-number-41YRCS', id: 'onboarding.contact-info.phone-number', kind: 'field', part: 'form' }}
                labels={phoneLabels}
                value={contactInfo.phoneNumber}
                onChange={(phoneNumber) => updateContactInfo({ phoneNumber })}
                invalid={Boolean(errors.phoneNumber)}
              />
            </FormField>

            <FormField id="onboarding.sections.contact-info-section.form-field.2" label={t('onboarding.contactInfo.whatsappNumber')} htmlFor="whatsappNumber" hint={t('onboarding.common.optional')}>
              <PhoneField id="onboarding.sections.contact-info-section.phone-field.2"
                ui={{ uid: 'onboarding.contact-info.whatsapp-number-E5i4Y5', id: 'onboarding.contact-info.whatsapp-number', kind: 'field', part: 'form' }}
                labels={phoneLabels}
                value={contactInfo.whatsappNumber}
                onChange={(whatsappNumber) => updateContactInfo({ whatsappNumber })}
              />
            </FormField>
          </div>

          <div {...uiAttributes({ uid: "onboarding.sections.contact-info-section.div.11-DajW39", id: "onboarding.sections.contact-info-section.div.11" })} id="onboarding.sections.contact-info-section.div.3" className="grid gap-6 lg:grid-cols-2">
            <FormField id="onboarding.sections.contact-info-section.form-field.3" label={t('onboarding.contactInfo.email')} htmlFor="email" required error={errors.email}>
              <FormInput ui={{ uid: 'onboarding.contact-info.email-5BREY3', id: 'onboarding.contact-info.email', kind: 'field', part: 'form' }}
                id="email"
                value={contactInfo.email}
                onChange={(e) => updateContactInfo({ email: e.target.value })}
                placeholder={t('onboarding.contactInfo.emailPlaceholder')}
                type="email"
                error={errors.email}
              />
            </FormField>

            <FormField id="onboarding.sections.contact-info-section.form-field.4" label={t('onboarding.contactInfo.website')} htmlFor="website" error={errors.website} hint={t('onboarding.common.optional')}>
              <FormInput ui={{ uid: 'onboarding.contact-info.website-6FlYrn', id: 'onboarding.contact-info.website', kind: 'field', part: 'form' }}
                id="website"
                value={contactInfo.website}
                onChange={(e) => updateContactInfo({ website: e.target.value })}
                placeholder={t('onboarding.contactInfo.websitePlaceholder')}
                type="url"
                error={errors.website}
              />
            </FormField>
          </div>

          <div {...uiAttributes({ uid: "onboarding.sections.contact-info-section.div.12-IjX5sf", id: "onboarding.sections.contact-info-section.div.12" })} id="onboarding.sections.contact-info-section.div.4" className="space-y-4">
            <div {...uiAttributes({ uid: "onboarding.sections.contact-info-section.div.13-9XkEQs", id: "onboarding.sections.contact-info-section.div.13" })} id="onboarding.sections.contact-info-section.div.5" className="flex items-center justify-between">
              <div {...uiAttributes({ uid: "onboarding.sections.contact-info-section.div.14-2LLZB2", id: "onboarding.sections.contact-info-section.div.14" })} id="onboarding.sections.contact-info-section.div.6">
                <Label ui={{ uid: "onboarding.sections.contact-info-section.label.2-h85L9w", id: "onboarding.sections.contact-info-section.label.2" }} id="onboarding.sections.contact-info-section.label" className="text-sm font-medium">{t('onboarding.contactInfo.socialLinks')}</Label>
                <p {...uiAttributes({ uid: "onboarding.sections.contact-info-section.p.2-WQd15w", id: "onboarding.sections.contact-info-section.p.2" })} id="onboarding.sections.contact-info-section.p" className="text-xs text-muted-foreground">{t('onboarding.contactInfo.socialHint')}</p>
              </div>
              {availablePlatforms.length > 0 && (
                <div {...uiAttributes({ uid: "onboarding.sections.contact-info-section.div.15-YFG0On", id: "onboarding.sections.contact-info-section.div.15" })} id="onboarding.sections.contact-info-section.div.7" className="flex flex-wrap gap-1">
                  {availablePlatforms.map((platform) => (
                    <Button
                      key={platform} ui={{ uid: "onboarding.sections.contact-info-section.button-1IM4Gz", id: "onboarding.sections.contact-info-section.button" , instance: createOpaqueUiInstanceId("iter-56bd6b2249", String(platform))}}
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
              <div {...uiAttributes({ uid: "onboarding.sections.contact-info-section.div.16-3Vf6Ui", id: "onboarding.sections.contact-info-section.div.16" })} id="onboarding.sections.contact-info-section.div.8" className="space-y-3">
                {contactInfo.socialLinks.map((link) => (
                  <div key={link.platform} {...uiAttributes({ uid: "onboarding.sections.contact-info-section.div.17-j91C0D", id: "onboarding.sections.contact-info-section.div.17" , instance: createOpaqueUiInstanceId("iter-3835b8cf1a", String(link.platform))})} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <span {...uiAttributes({ uid: "onboarding.sections.contact-info-section.span-U5zQs0", id: "onboarding.sections.contact-info-section.span" , instance: createOpaqueUiInstanceId("iter-8e40a32630", String(link.platform))})} className="text-sm font-medium">
                      {t(`onboarding.contactInfo.platforms.${link.platform}`)}
                    </span>
                    <div {...uiAttributes({ uid: "onboarding.sections.contact-info-section.div.18-KQ7yHG", id: "onboarding.sections.contact-info-section.div.18" , instance: createOpaqueUiInstanceId("iter-bf6db7be17", String(link.platform))})} className="flex-1 flex gap-2">
                      <FormInput ui={{ uid: "onboarding.sections.contact-info-section.form-input-kiYw9z", id: "onboarding.sections.contact-info-section.form-input" , instance: createOpaqueUiInstanceId("iter-0b0b34d3d6", String(link.platform))}}
                        value={link.url}
                        onChange={(e) => updateSocialLink(link.platform, { url: e.target.value })}
                        placeholder={t('onboarding.contactInfo.socialUrlPlaceholder')}
                        inputMode="url"
                        className="flex-1"
                      />
                    </div>
                    <Button ui={{ uid: "onboarding.sections.contact-info-section.button.2-jDAp98", id: "onboarding.sections.contact-info-section.button.2" , instance: createOpaqueUiInstanceId("iter-5dbbbd5e45", String(link.platform))}}
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

      <StepNavigation id="onboarding.sections.contact-info-section.step-navigation" onNext={handleNext} showSkip />
    </div>
  );
}

export default ContactInfoSection;
