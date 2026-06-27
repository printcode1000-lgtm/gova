'use client';

import * as React from 'react';
import { Plus, X, Phone, MessageCircle, Mail, Globe, Share2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const SOCIAL_PLATFORMS = [
  'instagram',
  'facebook',
  'twitter',
  'tiktok',
  'youtube',
  'pinterest',
] as const;

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  handle: string;
}

interface ContactInfoData {
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  website: string;
  socialLinks: SocialLink[];
}

interface ContactInfoCardProps {
  data?: ContactInfoData;
  onChange?: (data: ContactInfoData) => void;
  readOnly?: boolean;
}

export function ContactInfoCard({ data, onChange, readOnly = false }: ContactInfoCardProps) {
  const { t } = useTranslation();
  const [localData, setLocalData] = React.useState<ContactInfoData>(() => {
    if (data) {
      return {
        ...data,
        socialLinks: data.socialLinks.map((link, index) => ({
          ...link,
          id: link.id || `${link.platform}-${index}`,
        })),
      };
    }
    return {
      phoneNumber: '',
      whatsappNumber: '',
      email: '',
      website: '',
      socialLinks: [],
    };
  });

  const updateField = (field: keyof ContactInfoData, value: string) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onChange?.(newData);
  };

  const addSocialLink = (platform: string) => {
    const newData = {
      ...localData,
      socialLinks: [...localData.socialLinks, { id: Date.now().toString(), platform, url: '', handle: '' }],
    };
    setLocalData(newData);
    onChange?.(newData);
  };

  const updateSocialLink = (id: string, updates: { url?: string; handle?: string }) => {
    const newData = {
      ...localData,
      socialLinks: localData.socialLinks.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

  const removeSocialLink = (id: string) => {
    const newData = {
      ...localData,
      socialLinks: localData.socialLinks.filter((s) => s.id !== id),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

  const addAnotherLink = (platform: string) => {
    addSocialLink(platform);
  };

  const availablePlatforms = SOCIAL_PLATFORMS;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('onboarding.contactInfo.title')}</CardTitle>
        <CardDescription>{t('onboarding.contactInfo.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {t('onboarding.contactInfo.phoneNumber')}
            </Label>
            <Input
              id="phoneNumber"
              value={localData.phoneNumber}
              onChange={(e) => updateField('phoneNumber', e.target.value)}
              placeholder={t('onboarding.contactInfo.phonePlaceholder')}
              type="tel"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappNumber" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              {t('onboarding.contactInfo.whatsappNumber')}
              <span className="text-muted-foreground text-xs ms-1">({t('onboarding.common.optional')})</span>
            </Label>
            <Input
              id="whatsappNumber"
              value={localData.whatsappNumber}
              onChange={(e) => updateField('whatsappNumber', e.target.value)}
              placeholder={t('onboarding.contactInfo.phonePlaceholder')}
              type="tel"
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {t('onboarding.contactInfo.email')}
            </Label>
            <Input
              id="email"
              value={localData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder={t('onboarding.contactInfo.emailPlaceholder')}
              type="email"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              {t('onboarding.contactInfo.website')}
              <span className="text-muted-foreground text-xs ms-1">({t('onboarding.common.optional')})</span>
            </Label>
            <Input
              id="website"
              value={localData.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder={t('onboarding.contactInfo.websitePlaceholder')}
              type="url"
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Share2 className="h-4 w-4 text-muted-foreground" />
                {t('onboarding.contactInfo.socialLinks')}
              </Label>
              <p className="text-xs text-muted-foreground">{t('onboarding.contactInfo.socialHint')}</p>
            </div>
            {!readOnly && (
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

          {localData.socialLinks.length > 0 && (
            <div className="space-y-3">
              {localData.socialLinks.map((link) => (
                <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">
                    {t(`onboarding.contactInfo.platforms.${link.platform}`)}
                  </span>
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={link.handle}
                      onChange={(e) => updateSocialLink(link.id, { handle: e.target.value })}
                      placeholder={t('onboarding.contactInfo.usernamePlaceholder')}
                      className="flex-1"
                      disabled={readOnly}
                    />
                  </div>
                  <div className="flex gap-1">
                    {!readOnly && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => addAnotherLink(link.platform)}
                          className="shrink-0 h-8 w-8"
                          title={t('onboarding.contactInfo.addAnother')}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSocialLink(link.id)}
                          className="shrink-0 h-8 w-8"
                          title={t('onboarding.contactInfo.remove')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ContactInfoCard;
