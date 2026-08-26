'use client';

import * as React from 'react';
import { Plus, X, Phone, MessageCircle, Mail, Globe, Share2, ChevronDown, Lock, Smartphone, MapPin } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faEnvelope, faGlobe, faLocationDot, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from '@/shared/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/utils';
import { AsolMap, markerAt, createOpenStreetMapProvider, createNativePlatformGpsProvider } from '@asol/map-core';
import type { LocationEntry } from '@/features/profile/domain/profile-contacts.entity';
import { getContactVisualColor, getContactVisualIcon } from "../contact-visual-style";
import { shareLocationUrl } from "@/features/sharing/ui";
import { SOCIAL_PLATFORMS, PHONE_TYPES, SocialLink, PhoneLink, ContactInfoData, ContactInfoCardProps, tileProvider, gpsProvider, normalizeContactInfoData, quickAddColor, quickAddIcon, ContactQuickAddGrid } from "./ContactInfoCard.contact-types";
import type { ContactInfoCardModel } from "./ContactInfoCard.model";
import { ContactSectionHeader } from "./ContactSectionHeader";

export function PrimaryContactView({ model }: { model: ContactInfoCardModel }) {
const { data, onChange, readOnly, hidePrimarySection, t, locale, shouldWrapInCard, localData, setLocalData, isPasswordOpen, setIsPasswordOpen, passwordData, setPasswordData, openMapId, setOpenMapId, mapMessages, setMapMessages, updateField, addPhone, updatePhone, removePhone, addAnotherPhone, phonesForAdditional, groupedPhones, addedPhoneTypes, availablePhoneTypes, hasAdditionalEmails, hasWebsites, handleAddItem, addWebsite, updateWebsite, removeWebsite, addEmail, updateEmail, removeEmail, addSocialLink, updateSocialLink, removeSocialLink, addAnotherLink, addLocation, updateLocationEntry, removeLocation, setMapMessage, addedPlatforms, availablePlatforms, quickAddItems, groupedSocialLinks } = model;
return (
        <Card>
          <CardHeader>
            <CardTitle>{t('onboarding.contactInfo.title')}</CardTitle>
            <CardDescription>{t('onboarding.contactInfo.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Contact Section */}
            <Card>
              <CardHeader>
                <ContactSectionHeader
                  icon={Phone}
                  title={t('onboarding.contactInfo.primaryContact')}
                  description={t('onboarding.contactInfo.primaryContactHint')}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Primary WhatsApp */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-on-surface">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    {t('onboarding.contactInfo.phoneTypes.whatsapp')}
                  </Label>
                  <div className="relative">
                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant select-none">
                      +20
                    </span>
                    <input
                      type="tel"
                      inputMode="tel"
                      maxLength={11}
                      placeholder={t('auth.login.phonePlaceholder')}
                      className="auth-input ps-12 w-full"
                      value={localData.phones.find((p) => p.id === 'primary-whatsapp')?.number || ''}
                      onChange={(e) => updatePhone('primary-whatsapp', { number: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      disabled={readOnly}
                    />
                  </div>
                </div>

                {/* Primary Email */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {t('onboarding.contactInfo.email')}
                  </Label>
                  <Input ui={{ uid: 'profile.contact.primary-email-eJHx5o', id: 'profile.contact.primary-email', kind: 'field', part: 'primary' }}
                    value={localData.emails.find((e) => e.id === 'primary')?.email || ''}
                    onChange={(e) => updateEmail('primary', { email: e.target.value })}
                    placeholder={t('onboarding.contactInfo.emailPlaceholder')}
                    type="email"
                    disabled={readOnly}
                  />
                </div>

                {/* Password Change Section */}
                {!readOnly && (
                  <div className="space-y-2">
                    <Button ui={{ uid: 'profile.contact.toggle-password-xs20PV', id: 'profile.contact.toggle-password', kind: 'action', action: 'toggle-password-form', part: 'password' }}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => setIsPasswordOpen(!isPasswordOpen)}
                    >
                      <Lock className="h-4 w-4" />
                      {t('onboarding.contactInfo.changePassword')}
                      <ChevronDown className={`h-4 w-4 transition-transform ${isPasswordOpen ? 'rotate-180' : ''}`} />
                    </Button>
                    {isPasswordOpen && (
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">{t('onboarding.contactInfo.currentPassword')}</Label>
                          <Input ui={{ uid: 'profile.contact.current-password-f4RHGb', id: 'profile.contact.current-password', kind: 'field', part: 'password' }}
                            id="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            placeholder={t('onboarding.contactInfo.currentPasswordPlaceholder')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">{t('onboarding.contactInfo.newPassword')}</Label>
                          <Input ui={{ uid: 'profile.contact.new-password-QXC1u7', id: 'profile.contact.new-password', kind: 'field', part: 'password' }}
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            placeholder={t('onboarding.contactInfo.newPasswordPlaceholder')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">{t('onboarding.contactInfo.confirmPassword')}</Label>
                          <Input ui={{ uid: 'profile.contact.confirm-password-JJ8pJH', id: 'profile.contact.confirm-password', kind: 'field', part: 'password' }}
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            placeholder={t('onboarding.contactInfo.confirmPasswordPlaceholder')}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Contact Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                      {t('onboarding.contactInfo.additionalContact')}
                    </CardTitle>
                    <CardDescription className="text-xs">{t('onboarding.contactInfo.additionalContactHint')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {!readOnly && (
                  <ContactQuickAddGrid
                    items={quickAddItems}
                    onAdd={handleAddItem}
                    title={locale === 'ar' ? 'أضف وسيلة تواصل بسرعة' : 'Quick add contact method'}
                    emptyText={locale === 'ar' ? 'تمت إضافة كل الوسائل الأساسية المتاحة.' : 'All primary contact methods are already added.'}
                  />
                )}
            {/* Additional Phones */}
            {PHONE_TYPES.map((type) => {
              const typePhones = groupedPhones[type];
              if (!typePhones || typePhones.length === 0) return null;

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={quickAddIcon(type)}
                      className="h-4 w-4"
                      style={{ color: quickAddColor(type) }}
                    />
                    <span className="text-xs sm:text-sm font-semibold" style={{ color: quickAddColor(type) }}>
                      {t(`onboarding.contactInfo.phoneTypes.${type}`)}
                    </span>
                    {!readOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addAnotherPhone(type)}
                        className="gap-1 h-5 sm:h-6 px-2 text-[10px] sm:text-xs"
                      >
                        <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {typePhones.map((phone) => (
                      <div
                        key={phone.id}
                        className="flex items-center gap-2 rounded-lg border p-2 sm:gap-3 sm:p-3"
                        style={{
                          backgroundColor: `${quickAddColor(type)}10`,
                          borderColor: `${quickAddColor(type)}44`,
                        }}
                      >
                        <FontAwesomeIcon
                          icon={quickAddIcon(type)}
                          className="hidden h-4 w-4 shrink-0 sm:block"
                          style={{ color: quickAddColor(type) }}
                        />
                        <div className="flex-1 relative">
                          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-on-surface-variant select-none">
                            +20
                          </span>
                          <input
                            type="tel"
                            inputMode="tel"
                            maxLength={11}
                            placeholder={t('auth.login.phonePlaceholder')}
                            className="auth-input ps-12 w-full text-sm"
                            value={phone.number}
                            onChange={(e) => updatePhone(phone.id, { number: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                            disabled={readOnly}
                          />
                        </div>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePhone(phone.id)}
                            className="shrink-0 h-7 w-7 sm:h-8 sm:w-8"
                            aria-label={t('onboarding.contactInfo.remove')}
                          >
                            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Additional Emails */}
            {localData.emails.filter((e) => e.id !== 'primary').length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <FontAwesomeIcon icon={quickAddIcon('email')} className="h-4 w-4" style={{ color: quickAddColor('email') }} />
                    <span style={{ color: quickAddColor('email') }}>{t('onboarding.contactInfo.emails')}</span>
                  </span>
                  {!readOnly && (
                    <Button ui={{ uid: 'profile.contact.add-email-2UgRs5', id: 'profile.contact.add-email', kind: 'action', action: 'add-email', part: 'emails' }}
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
                  {localData.emails.filter((e) => e.id !== 'primary').map((emailLink) => (
                    <div
                      key={emailLink.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                      style={{
                        backgroundColor: `${quickAddColor('email')}10`,
                        borderColor: `${quickAddColor('email')}44`,
                      }}
                    >
                      <FontAwesomeIcon icon={quickAddIcon('email')} className="hidden h-4 w-4 shrink-0 sm:block" style={{ color: quickAddColor('email') }} />
                      <div className="flex-1">
                        <Input
                          value={emailLink.email}
                          onChange={(e) => updateEmail(emailLink.id, { email: e.target.value })}
                          placeholder={t('onboarding.contactInfo.emailPlaceholder')}
                          type="email"
                          disabled={readOnly}
                        />
                      </div>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEmail(emailLink.id)}
                          className="shrink-0 h-8 w-8"
                          aria-label={t('onboarding.contactInfo.remove')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {localData.socialLinks.length > 0 && (
              <div className="space-y-4">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const platformLinks = groupedSocialLinks[platform];
                  if (!platformLinks || platformLinks.length === 0) return null;

                  return (
                    <div key={platform} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon
                          icon={quickAddIcon(platform)}
                          className="h-4 w-4"
                          style={{ color: quickAddColor(platform) }}
                        />
                        <span className="text-sm font-semibold" style={{ color: quickAddColor(platform) }}>
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
                          <div
                            key={link.id}
                            className="flex items-center gap-3 rounded-lg border p-3"
                            style={{
                              backgroundColor: `${quickAddColor(platform)}10`,
                              borderColor: `${quickAddColor(platform)}44`,
                            }}
                          >
                            <FontAwesomeIcon icon={quickAddIcon(platform)} className="hidden h-4 w-4 shrink-0 sm:block" style={{ color: quickAddColor(platform) }} />
                            <div className="flex-1">
                              <Input
                                value={link.url}
                                onChange={(e) => updateSocialLink(link.id, { url: e.target.value })}
                                placeholder={t('onboarding.contactInfo.socialUrlPlaceholder')}
                                className="w-full"
                                inputMode="url"
                                disabled={readOnly}
                              />
                            </div>
                            {!readOnly && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSocialLink(link.id)}
                                className="shrink-0 h-8 w-8"
                                aria-label={t('onboarding.contactInfo.remove')}
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

            {/* Websites */}
            {localData.websites.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <FontAwesomeIcon icon={quickAddIcon('website')} className="h-4 w-4" style={{ color: quickAddColor('website') }} />
                    <span style={{ color: quickAddColor('website') }}>{t('onboarding.contactInfo.websites')}</span>
                  </span>
                  {!readOnly && (
                    <Button ui={{ uid: 'profile.contact.add-website-nQM78h', id: 'profile.contact.add-website', kind: 'action', action: 'add-website', part: 'websites' }}
                      variant="outline"
                      size="sm"
                      onClick={addWebsite}
                      className="gap-1 h-6 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {localData.websites.map((site) => (
                    <div
                      key={site.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                      style={{
                        backgroundColor: `${quickAddColor('website')}10`,
                        borderColor: `${quickAddColor('website')}44`,
                      }}
                    >
                      <FontAwesomeIcon icon={quickAddIcon('website')} className="hidden h-4 w-4 shrink-0 sm:block" style={{ color: quickAddColor('website') }} />
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
                          aria-label={t('onboarding.contactInfo.remove')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </CardContent>
        </Card>
      );
}
