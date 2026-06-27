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

const PHONE_TYPES = [
  'whatsapp',
  'phone',
  'fax',
  'telegram',
  'viber',
] as const;

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  handle: string;
}

interface WebsiteLink {
  id: string;
  url: string;
}

interface EmailLink {
  id: string;
  email: string;
  isPrimary: boolean;
}

interface PhoneLink {
  id: string;
  number: string;
  type: string;
}

interface ContactInfoData {
  phones: PhoneLink[];
  emails: EmailLink[];
  websites: WebsiteLink[];
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
        phones: data.phones?.map((phone, index) => ({
          ...phone,
          id: phone.id || `phone-${index}`,
        })) || [],
        emails: data.emails?.map((email, index) => ({
          ...email,
          id: email.id || `email-${index}`,
        })) || [],
        websites: data.websites?.map((site, index) => ({
          ...site,
          id: site.id || `website-${index}`,
        })) || [],
        socialLinks: data.socialLinks.map((link, index) => ({
          ...link,
          id: link.id || `${link.platform}-${index}`,
        })),
      };
    }
    return {
      phones: [{ id: 'primary-whatsapp', number: '', type: 'whatsapp' }],
      emails: [{ id: 'primary', email: '', isPrimary: true }],
      websites: [],
      socialLinks: [],
    };
  });

  const updateField = (field: keyof ContactInfoData, value: string) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onChange?.(newData);
  };

  const addPhone = (type: string) => {
    const newData = {
      ...localData,
      phones: [...localData.phones, { id: Date.now().toString(), number: '', type }],
    };
    setLocalData(newData);
    onChange?.(newData);
  };

  const updatePhone = (id: string, updates: { number?: string }) => {
    const newData = {
      ...localData,
      phones: localData.phones.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

  const removePhone = (id: string) => {
    const newData = {
      ...localData,
      phones: localData.phones.filter((p) => p.id !== id),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

  const addAnotherPhone = (type: string) => {
    addPhone(type);
  };

  const addedPhoneTypes = localData.phones.map((p) => p.type);
  const availablePhoneTypes = PHONE_TYPES.filter((p) => !addedPhoneTypes.includes(p));

  const addWebsite = () => {
    const newData = {
      ...localData,
      websites: [...localData.websites, { id: Date.now().toString(), url: '' }],
    };
    setLocalData(newData);
    onChange?.(newData);
  };

  const updateWebsite = (id: string, updates: { url?: string }) => {
    const newData = {
      ...localData,
      websites: localData.websites.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

  const removeWebsite = (id: string) => {
    const newData = {
      ...localData,
      websites: localData.websites.filter((s) => s.id !== id),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

  const addEmail = () => {
    const newData = {
      ...localData,
      emails: [...localData.emails, { id: Date.now().toString(), email: '', isPrimary: false }],
    };
    setLocalData(newData);
    onChange?.(newData);
  };

  const updateEmail = (id: string, updates: { email?: string }) => {
    const newData = {
      ...localData,
      emails: localData.emails.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

  const removeEmail = (id: string) => {
    const newData = {
      ...localData,
      emails: localData.emails.filter((e) => e.id !== id),
    };
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

  const addedPlatforms = localData.socialLinks.map((s) => s.platform);
  const availablePlatforms = SOCIAL_PLATFORMS.filter((p) => !addedPlatforms.includes(p));

  // Group phones by type
  const groupedPhones = React.useMemo(() => {
    const grouped: Record<string, PhoneLink[]> = {};
    localData.phones.forEach((phone) => {
      if (!grouped[phone.type]) {
        grouped[phone.type] = [];
      }
      grouped[phone.type].push(phone);
    });
    return grouped;
  }, [localData.phones]);

  // Group and sort social links by platform
  const groupedSocialLinks = React.useMemo(() => {
    const grouped: Record<string, SocialLink[]> = {};
    localData.socialLinks.forEach((link) => {
      if (!grouped[link.platform]) {
        grouped[link.platform] = [];
      }
      grouped[link.platform].push(link);
    });
    return grouped;
  }, [localData.socialLinks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('onboarding.contactInfo.title')}</CardTitle>
        <CardDescription>{t('onboarding.contactInfo.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact Methods Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {t('onboarding.contactInfo.contactMethods')}
                </CardTitle>
                <CardDescription className="text-xs">{t('onboarding.contactInfo.contactMethodsHint')}</CardDescription>
              </div>
              {!readOnly && (
                <div className="flex flex-wrap gap-1">
                  {availablePhoneTypes.map((type) => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      onClick={() => addPhone(type)}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      {t(`onboarding.contactInfo.phoneTypes.${type}`)}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addEmail}
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    {t('onboarding.contactInfo.addEmail')}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phones */}
            {PHONE_TYPES.map((type) => {
              const typePhones = groupedPhones[type];
              if (!typePhones || typePhones.length === 0) return null;

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {t(`onboarding.contactInfo.phoneTypes.${type}`)}
                    </span>
                    {!readOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addAnotherPhone(type)}
                        className="gap-1 h-6 px-2 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {typePhones.map((phone) => (
                      <div key={phone.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex-1">
                          <Input
                            value={phone.number}
                            onChange={(e) => updatePhone(phone.id, { number: e.target.value })}
                            placeholder={t('onboarding.contactInfo.phonePlaceholder')}
                            type="tel"
                            disabled={readOnly}
                          />
                        </div>
                        {!readOnly && phone.id !== 'primary-whatsapp' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePhone(phone.id)}
                            className="shrink-0 h-8 w-8"
                            title={t('onboarding.contactInfo.remove')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Emails */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {t('onboarding.contactInfo.emails')}
                </span>
                {!readOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addEmail}
                    className="gap-1 h-6 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {localData.emails.map((emailLink) => (
                  <div key={emailLink.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <Input
                        value={emailLink.email}
                        onChange={(e) => updateEmail(emailLink.id, { email: e.target.value })}
                        placeholder={t('onboarding.contactInfo.emailPlaceholder')}
                        type="email"
                        disabled={readOnly}
                      />
                    </div>
                    {emailLink.isPrimary && (
                      <span className="text-xs text-muted-foreground px-2">
                        {t('onboarding.contactInfo.primary')}
                      </span>
                    )}
                    {!readOnly && !emailLink.isPrimary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmail(emailLink.id)}
                        className="shrink-0 h-8 w-8"
                        title={t('onboarding.contactInfo.remove')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Links Section */}
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
            <div className="space-y-4">
              {SOCIAL_PLATFORMS.map((platform) => {
                const platformLinks = groupedSocialLinks[platform];
                if (!platformLinks || platformLinks.length === 0) return null;

                return (
                  <div key={platform} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {t(`onboarding.contactInfo.platforms.${platform}`)}
                      </span>
                      {!readOnly && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addAnotherLink(platform)}
                          className="gap-1 h-6 px-2 text-xs"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {platformLinks.map((link) => (
                        <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex-1">
                            <Input
                              value={link.handle}
                              onChange={(e) => updateSocialLink(link.id, { handle: e.target.value })}
                              placeholder={t('onboarding.contactInfo.usernamePlaceholder')}
                              className="w-full"
                              disabled={readOnly}
                            />
                          </div>
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSocialLink(link.id)}
                              className="shrink-0 h-8 w-8"
                              title={t('onboarding.contactInfo.remove')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Websites Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {t('onboarding.contactInfo.websites')}
              </Label>
              <p className="text-xs text-muted-foreground">{t('onboarding.contactInfo.websitesHint')}</p>
            </div>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={addWebsite}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3 w-3" />
                {t('onboarding.contactInfo.addWebsite')}
              </Button>
            )}
          </div>

          {localData.websites.length > 0 && (
            <div className="space-y-2">
              {localData.websites.map((site) => (
                <div key={site.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <Input
                      value={site.url}
                      onChange={(e) => updateWebsite(site.id, { url: e.target.value })}
                      placeholder={t('onboarding.contactInfo.websitePlaceholder')}
                      type="url"
                      disabled={readOnly}
                    />
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeWebsite(site.id)}
                      className="shrink-0 h-8 w-8"
                      title={t('onboarding.contactInfo.remove')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
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
