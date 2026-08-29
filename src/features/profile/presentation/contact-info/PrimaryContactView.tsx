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
import { PhoneField } from '@/shared/ui/phone-field';
import { phoneFieldLabels } from '@/shared/phone/phone-field-labels';
import { cn } from '@/shared/utils';
import { AsolMap, markerAt, createOpenStreetMapProvider, createNativePlatformGpsProvider } from '@asol/map-core';
import type { LocationEntry } from '@/features/profile/domain/profile-contacts.entity';
import { getContactVisualColor, getContactVisualIcon } from "../contact-visual-style";
import { shareLocationUrl } from "@/features/sharing/ui";
import { SOCIAL_PLATFORMS, PHONE_TYPES, SocialLink, PhoneLink, ContactInfoData, ContactInfoCardProps, tileProvider, gpsProvider, normalizeContactInfoData, quickAddColor, quickAddIcon, ContactQuickAddGrid } from "./ContactInfoCard.contact-types";
import type { ContactInfoCardModel } from "./ContactInfoCard.model";
import { ContactSectionHeader } from "./ContactSectionHeader";
import { ContactEntryCard } from "./ContactEntryCard";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { foldPasswordDigits } from "@asol/auth-core";
import { uiAttributes } from "@asol/ui-registry-core";

export function PrimaryContactView({ model }: { model: ContactInfoCardModel }) {
const { data, onChange, readOnly, hidePrimarySection, t, locale, shouldWrapInCard, localData, setLocalData, isPasswordOpen, setIsPasswordOpen, passwordData, setPasswordData, openMapId, setOpenMapId, mapMessages, setMapMessages, updateField, addPhone, updatePhone, removePhone, addAnotherPhone, phonesForAdditional, groupedPhones, addedPhoneTypes, availablePhoneTypes, hasAdditionalEmails, hasWebsites, handleAddItem, addWebsite, updateWebsite, removeWebsite, addEmail, updateEmail, removeEmail, addSocialLink, updateSocialLink, removeSocialLink, addAnotherLink, addLocation, updateLocationEntry, removeLocation, setMapMessage, addedPlatforms, availablePlatforms, quickAddItems, selectedKindId, selectContactKind, activeKindId, pendingRemoval, requestRemoveEntry, cancelRemoveEntry, confirmRemoveEntry, groupedSocialLinks } = model;
const phoneLabels = phoneFieldLabels(t, locale);
return (
        <Card ui={{ uid: "profile.contact-info.primary-contact-view.card.4-WfL7n4", id: "profile.contact-info.primary-contact-view.card.4" }} id="profile.contact-info.primary-contact-view.card">
          <CardHeader ui={{ uid: "profile.contact-info.primary-contact-view.card-header.4-bmKiJ7", id: "profile.contact-info.primary-contact-view.card-header.4" }} id="profile.contact-info.primary-contact-view.card-header">
            <CardTitle ui={{ uid: "profile.contact-info.primary-contact-view.card-title.3-G0Fk0K", id: "profile.contact-info.primary-contact-view.card-title.3" }} id="profile.contact-info.primary-contact-view.card-title">{t('onboarding.contactInfo.title')}</CardTitle>
            <CardDescription ui={{ uid: "profile.contact-info.primary-contact-view.card-description.3-7s4Bl0", id: "profile.contact-info.primary-contact-view.card-description.3" }} id="profile.contact-info.primary-contact-view.card-description">{t('onboarding.contactInfo.description')}</CardDescription>
          </CardHeader>
          <CardContent ui={{ uid: "profile.contact-info.primary-contact-view.card-content.4-p7k8pY", id: "profile.contact-info.primary-contact-view.card-content.4" }} id="profile.contact-info.primary-contact-view.card-content" className="space-y-6">
            {/* Primary Contact Section */}
            <Card ui={{ uid: "profile.contact-info.primary-contact-view.card.5-98LYy2", id: "profile.contact-info.primary-contact-view.card.5" }} id="profile.contact-info.primary-contact-view.card.2">
              <CardHeader ui={{ uid: "profile.contact-info.primary-contact-view.card-header.5-CPPX1S", id: "profile.contact-info.primary-contact-view.card-header.5" }} id="profile.contact-info.primary-contact-view.card-header.2">
                <ContactSectionHeader id="profile.contact-info.primary-contact-view.contact-section-header"
                  icon={Phone}
                  title={t('onboarding.contactInfo.primaryContact')}
                  description={t('onboarding.contactInfo.primaryContactHint')}
                />
              </CardHeader>
              <CardContent ui={{ uid: "profile.contact-info.primary-contact-view.card-content.5-u1ZyOf", id: "profile.contact-info.primary-contact-view.card-content.5" }} id="profile.contact-info.primary-contact-view.card-content.2" className="space-y-4">
                {/* Primary WhatsApp */}
                <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.18-Kyr8V7", id: "profile.contact-info.primary-contact-view.div.18" })} id="profile.contact-info.primary-contact-view.div" className="space-y-2">
                  <Label ui={{ uid: "profile.contact-info.primary-contact-view.label.6-KjNR7h", id: "profile.contact-info.primary-contact-view.label.6" }} id="profile.contact-info.primary-contact-view.label" className="text-sm font-semibold flex items-center gap-2 text-on-surface">
                    <MessageCircle id="profile.contact-info.primary-contact-view.message-circle" className="h-4 w-4 text-primary" />
                    {t('onboarding.contactInfo.phoneTypes.whatsapp')}
                  </Label>
                  <PhoneField ui={{ uid: "profile.contact-info.primary-contact-view.phone-field-uhUt9T", id: "profile.contact-info.primary-contact-view.phone-field" }} id="profile.contact-info.primary-contact-view.div.2"
                    labels={phoneLabels}
                    inputClassName="auth-input w-full"
                    value={localData.phones.find((p) => p.id === 'primary-whatsapp')?.number || ''}
                    onChange={(number) => updatePhone('primary-whatsapp', { number })}
                    disabled={readOnly}
                  />
                </div>

                {/* Primary Email */}
                <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.19-52yZMF", id: "profile.contact-info.primary-contact-view.div.19" })} id="profile.contact-info.primary-contact-view.div.3" className="space-y-2">
                  <Label ui={{ uid: "profile.contact-info.primary-contact-view.label.7-D7zReG", id: "profile.contact-info.primary-contact-view.label.7" }} id="profile.contact-info.primary-contact-view.label.2" className="text-sm font-medium flex items-center gap-2">
                    <Mail id="profile.contact-info.primary-contact-view.mail" className="h-4 w-4 text-muted-foreground" />
                    {t('onboarding.contactInfo.email')}
                  </Label>
                  <Input id="profile.contact-info.primary-contact-view.input.2" ui={{ uid: 'profile.contact.primary-email-eJHx5o', id: 'profile.contact.primary-email', kind: 'field', part: 'primary' }}
                    value={localData.emails.find((e) => e.id === 'primary')?.email || ''}
                    onChange={(e) => updateEmail('primary', { email: e.target.value })}
                    placeholder={t('onboarding.contactInfo.emailPlaceholder')}
                    type="email"
                    disabled={readOnly}
                  />
                </div>

                {/* Password Change Section */}
                {!readOnly && (
                  <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.20-QoH391", id: "profile.contact-info.primary-contact-view.div.20" })} id="profile.contact-info.primary-contact-view.div.4" className="space-y-2">
                    <Button id="profile.contact-info.primary-contact-view.button" ui={{ uid: 'profile.contact.toggle-password-xs20PV', id: 'profile.contact.toggle-password', kind: 'action', action: 'toggle-password-form', part: 'password' }}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => setIsPasswordOpen(!isPasswordOpen)}
                    >
                      <Lock id="profile.contact-info.primary-contact-view.lock" className="h-4 w-4" />
                      {t('onboarding.contactInfo.changePassword')}
                      <ChevronDown id="profile.contact-info.primary-contact-view.chevron-down" className={`h-4 w-4 transition-transform ${isPasswordOpen ? 'rotate-180' : ''}`} />
                    </Button>
                    {isPasswordOpen && (
                      <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.21-j7OAUC", id: "profile.contact-info.primary-contact-view.div.21" })} id="profile.contact-info.primary-contact-view.div.5" className="space-y-4 pt-4">
                        <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.22-fP8B4g", id: "profile.contact-info.primary-contact-view.div.22" })} id="profile.contact-info.primary-contact-view.div.6" className="space-y-2">
                          <Label ui={{ uid: "profile.contact-info.primary-contact-view.label.8-M9SgSA", id: "profile.contact-info.primary-contact-view.label.8" }} id="profile.contact-info.primary-contact-view.label.3" htmlFor="profile.primary-contact.current-password">{t('onboarding.contactInfo.currentPassword')}</Label>
                          <Input ui={{ uid: 'profile.contact.current-password-f4RHGb', id: 'profile.contact.current-password', kind: 'field', part: 'password' }}
                            id="profile.primary-contact.current-password"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: foldPasswordDigits(e.target.value) })}
                            placeholder={t('onboarding.contactInfo.currentPasswordPlaceholder')}
                          />
                        </div>
                        <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.23-2pGmF2", id: "profile.contact-info.primary-contact-view.div.23" })} id="profile.contact-info.primary-contact-view.div.7" className="space-y-2">
                          <Label ui={{ uid: "profile.contact-info.primary-contact-view.label.9-O7fDiC", id: "profile.contact-info.primary-contact-view.label.9" }} id="profile.contact-info.primary-contact-view.label.4" htmlFor="profile.primary-contact.new-password">{t('onboarding.contactInfo.newPassword')}</Label>
                          <Input ui={{ uid: 'profile.contact.new-password-QXC1u7', id: 'profile.contact.new-password', kind: 'field', part: 'password' }}
                            id="profile.primary-contact.new-password"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: foldPasswordDigits(e.target.value) })}
                            placeholder={t('onboarding.contactInfo.newPasswordPlaceholder')}
                          />
                        </div>
                        <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.24-hT1M41", id: "profile.contact-info.primary-contact-view.div.24" })} id="profile.contact-info.primary-contact-view.div.8" className="space-y-2">
                          <Label ui={{ uid: "profile.contact-info.primary-contact-view.label.10-M1EFmB", id: "profile.contact-info.primary-contact-view.label.10" }} id="profile.contact-info.primary-contact-view.label.5" htmlFor="profile.primary-contact.confirm-password">{t('onboarding.contactInfo.confirmPassword')}</Label>
                          <Input ui={{ uid: 'profile.contact.confirm-password-JJ8pJH', id: 'profile.contact.confirm-password', kind: 'field', part: 'password' }}
                            id="profile.primary-contact.confirm-password"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: foldPasswordDigits(e.target.value) })}
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
            <Card ui={{ uid: "profile.contact-info.primary-contact-view.card.6-ckL1qu", id: "profile.contact-info.primary-contact-view.card.6" }} id="profile.contact-info.primary-contact-view.card.3">
              <CardHeader ui={{ uid: "profile.contact-info.primary-contact-view.card-header.6-3Q7WrX", id: "profile.contact-info.primary-contact-view.card-header.6" }} id="profile.contact-info.primary-contact-view.card-header.3">
                <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.25-y5eJsW", id: "profile.contact-info.primary-contact-view.div.25" })} id="profile.contact-info.primary-contact-view.div.9" className="flex items-center justify-between">
                  <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.26-oWNaW6", id: "profile.contact-info.primary-contact-view.div.26" })} id="profile.contact-info.primary-contact-view.div.10">
                    <CardTitle ui={{ uid: "profile.contact-info.primary-contact-view.card-title.4-XTp2V6", id: "profile.contact-info.primary-contact-view.card-title.4" }} id="profile.contact-info.primary-contact-view.card-title.2" className="text-base flex items-center gap-2">
                      <Share2 id="profile.contact-info.primary-contact-view.share2" className="h-4 w-4 text-muted-foreground" />
                      {t('onboarding.contactInfo.additionalContact')}
                    </CardTitle>
                    <CardDescription ui={{ uid: "profile.contact-info.primary-contact-view.card-description.4-bo41kO", id: "profile.contact-info.primary-contact-view.card-description.4" }} id="profile.contact-info.primary-contact-view.card-description.2" className="text-xs">{t('onboarding.contactInfo.additionalContactHint')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent ui={{ uid: "profile.contact-info.primary-contact-view.card-content.6-2AxKiE", id: "profile.contact-info.primary-contact-view.card-content.6" }} id="profile.contact-info.primary-contact-view.card-content.3" className="space-y-3 sm:space-y-4">
                {!readOnly && (
                  <ContactQuickAddGrid id="profile.contact-info.primary-contact-view.contact-quick-add-grid"
                    items={quickAddItems}
                    selectedId={activeKindId}
                    onSelect={selectContactKind}
                    title={locale === 'ar' ? 'أضف وسيلة تواصل بسرعة' : 'Quick add contact method'}
                  />
                )}
            {/* Additional Phones */}
            {PHONE_TYPES.map((type) => {
              if (type !== activeKindId) return null;
              const typePhones = groupedPhones[type];
              if (!typePhones || typePhones.length === 0) return null;

              return (
                <div key={type} {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.27-mUDB2C", id: "profile.contact-info.primary-contact-view.div.27" })} className="space-y-2">
                  <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.28-B9F7uL", id: "profile.contact-info.primary-contact-view.div.28" })} className="flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={quickAddIcon(type)}
                      className="h-4 w-4"
                      style={{ color: quickAddColor(type) }}
                    />
                    <span {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.span-91SBX7", id: "profile.contact-info.primary-contact-view.span" })} className="text-xs sm:text-sm font-semibold" style={{ color: quickAddColor(type) }}>
                      {t(`onboarding.contactInfo.phoneTypes.${type}`)}
                    </span>
                    {!readOnly && (
                      <Button ui={{ uid: "profile.contact-info.primary-contact-view.button.4-Ni9o7J", id: "profile.contact-info.primary-contact-view.button.4" }}
                        variant="outline"
                        size="sm"
                        onClick={() => addAnotherPhone(type)}
                        className="gap-1 h-5 sm:h-6 px-2 text-[10px] sm:text-xs"
                      >
                        <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </Button>
                    )}
                  </div>
                  <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.29-0PXYIJ", id: "profile.contact-info.primary-contact-view.div.29" })} className="space-y-2">
                    {typePhones.map((phone, index) => (
                      <ContactEntryCard
                        key={phone.id}
                        color={quickAddColor(type)}
                        icon={quickAddIcon(type)}
                        title={`${t(`onboarding.contactInfo.phoneTypes.${type}`)} #${index + 1}`}
                        removeLabel={t('onboarding.contactInfo.remove')}
                        onRemove={
                          readOnly
                            ? undefined
                            : () => requestRemoveEntry('phone', phone.id)
                        }
                      >
                        <PhoneField ui={{ uid: "profile.contact-info.primary-contact-view.phone-field.2-0UyUJd", id: "profile.contact-info.primary-contact-view.phone-field.2" }}
                          labels={phoneLabels}
                          inputClassName="auth-input w-full text-sm"
                          value={phone.number}
                          onChange={(number) => updatePhone(phone.id, { number })}
                          disabled={readOnly}
                        />
                      </ContactEntryCard>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Additional Emails */}
            {activeKindId === 'email' && localData.emails.filter((e) => e.id !== 'primary').length > 0 && (
              <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.30-SQKMX9", id: "profile.contact-info.primary-contact-view.div.30" })} id="profile.contact-info.primary-contact-view.div.11" className="space-y-2">
                <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.31-1cAI28", id: "profile.contact-info.primary-contact-view.div.31" })} id="profile.contact-info.primary-contact-view.div.12" className="flex items-center gap-2">
                  <span {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.span.6-W3cTdF", id: "profile.contact-info.primary-contact-view.span.6" })} id="profile.contact-info.primary-contact-view.span.2" className="text-sm font-semibold flex items-center gap-2">
                    <FontAwesomeIcon id="profile.contact-info.primary-contact-view.font-awesome-icon" icon={quickAddIcon('email')} className="h-4 w-4" style={{ color: quickAddColor('email') }} />
                    <span {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.span.7-wpN3kl", id: "profile.contact-info.primary-contact-view.span.7" })} id="profile.contact-info.primary-contact-view.span.3" style={{ color: quickAddColor('email') }}>{t('onboarding.contactInfo.emails')}</span>
                  </span>
                  {!readOnly && (
                    <Button id="profile.contact-info.primary-contact-view.button.2" ui={{ uid: 'profile.contact.add-email-2UgRs5', id: 'profile.contact.add-email', kind: 'action', action: 'add-email', part: 'emails' }}
                      variant="outline"
                      size="sm"
                      onClick={addEmail}
                      className="gap-1 h-6 px-2 text-xs"
                    >
                      <Plus id="profile.contact-info.primary-contact-view.plus" className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.32-3XCLJP", id: "profile.contact-info.primary-contact-view.div.32" })} id="profile.contact-info.primary-contact-view.div.13" className="space-y-2">
                  {localData.emails.filter((e) => e.id !== 'primary').map((emailLink, index) => (
                    <ContactEntryCard
                      key={emailLink.id}
                      color={quickAddColor('email')}
                      icon={quickAddIcon('email')}
                      title={`${t('onboarding.contactInfo.email')} #${index + 1}`}
                      removeLabel={t('onboarding.contactInfo.remove')}
                      onRemove={
                        readOnly
                          ? undefined
                          : () => requestRemoveEntry('email', emailLink.id)
                      }
                    >
                      <Input ui={{ uid: "profile.contact-info.primary-contact-view.input-SRkyk5", id: "profile.contact-info.primary-contact-view.input" }}
                        value={emailLink.email}
                        onChange={(e) => updateEmail(emailLink.id, { email: e.target.value })}
                        placeholder={t('onboarding.contactInfo.emailPlaceholder')}
                        type="email"
                        disabled={readOnly}
                      />
                    </ContactEntryCard>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {SOCIAL_PLATFORMS.some((platform) => platform === activeKindId) && localData.socialLinks.length > 0 && (
              <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.33-JmLX82", id: "profile.contact-info.primary-contact-view.div.33" })} id="profile.contact-info.primary-contact-view.div.14" className="space-y-4">
                {SOCIAL_PLATFORMS.map((platform) => {
                  if (platform !== activeKindId) return null;
                  const platformLinks = groupedSocialLinks[platform];
                  if (!platformLinks || platformLinks.length === 0) return null;

                  return (
                    <div key={platform} {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.34-JzkZl6", id: "profile.contact-info.primary-contact-view.div.34" })} className="space-y-2">
                      <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.35-Pb7ruu", id: "profile.contact-info.primary-contact-view.div.35" })} className="flex items-center gap-2">
                        <FontAwesomeIcon
                          icon={quickAddIcon(platform)}
                          className="h-4 w-4"
                          style={{ color: quickAddColor(platform) }}
                        />
                        <span {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.span.8-U9HSp2", id: "profile.contact-info.primary-contact-view.span.8" })} className="text-sm font-semibold" style={{ color: quickAddColor(platform) }}>
                          {t(`onboarding.contactInfo.platforms.${platform}`)}
                        </span>
                        {!readOnly && (
                          <Button ui={{ uid: "profile.contact-info.primary-contact-view.button.5-llj6Tk", id: "profile.contact-info.primary-contact-view.button.5" }}
                            variant="outline"
                            size="sm"
                            onClick={() => addAnotherLink(platform)}
                            className="gap-1 h-6 px-2 text-xs"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.36-C8sF2X", id: "profile.contact-info.primary-contact-view.div.36" })} className="space-y-2">
                        {platformLinks.map((link, index) => (
                          <ContactEntryCard
                            key={link.id}
                            color={quickAddColor(platform)}
                            icon={quickAddIcon(platform)}
                            title={`${t(`onboarding.contactInfo.platforms.${platform}`)} #${index + 1}`}
                            removeLabel={t('onboarding.contactInfo.remove')}
                            onRemove={
                              readOnly
                                ? undefined
                                : () => requestRemoveEntry('social', link.id)
                            }
                          >
                            <Input ui={{ uid: "profile.contact-info.primary-contact-view.input.3-3MRiGl", id: "profile.contact-info.primary-contact-view.input.3" }}
                              value={link.url}
                              onChange={(e) => updateSocialLink(link.id, { url: e.target.value })}
                              placeholder={t('onboarding.contactInfo.socialUrlPlaceholder')}
                              className="w-full"
                              inputMode="url"
                              disabled={readOnly}
                            />
                          </ContactEntryCard>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Websites */}
            {activeKindId === 'website' && localData.websites.length > 0 && (
              <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.37-2HBZYE", id: "profile.contact-info.primary-contact-view.div.37" })} id="profile.contact-info.primary-contact-view.div.15" className="space-y-2">
                <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.38-id4RIp", id: "profile.contact-info.primary-contact-view.div.38" })} id="profile.contact-info.primary-contact-view.div.16" className="flex items-center gap-2">
                  <span {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.span.9-Y1RJj9", id: "profile.contact-info.primary-contact-view.span.9" })} id="profile.contact-info.primary-contact-view.span.4" className="text-sm font-semibold flex items-center gap-2">
                    <FontAwesomeIcon id="profile.contact-info.primary-contact-view.font-awesome-icon.2" icon={quickAddIcon('website')} className="h-4 w-4" style={{ color: quickAddColor('website') }} />
                    <span {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.span.10-NK8z7I", id: "profile.contact-info.primary-contact-view.span.10" })} id="profile.contact-info.primary-contact-view.span.5" style={{ color: quickAddColor('website') }}>{t('onboarding.contactInfo.websites')}</span>
                  </span>
                  {!readOnly && (
                    <Button id="profile.contact-info.primary-contact-view.button.3" ui={{ uid: 'profile.contact.add-website-nQM78h', id: 'profile.contact.add-website', kind: 'action', action: 'add-website', part: 'websites' }}
                      variant="outline"
                      size="sm"
                      onClick={addWebsite}
                      className="gap-1 h-6 px-2 text-xs"
                    >
                      <Plus id="profile.contact-info.primary-contact-view.plus.2" className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div {...uiAttributes({ uid: "profile.contact-info.primary-contact-view.div.39-i2UHnH", id: "profile.contact-info.primary-contact-view.div.39" })} id="profile.contact-info.primary-contact-view.div.17" className="space-y-2">
                  {localData.websites.map((site, index) => (
                    <ContactEntryCard
                      key={site.id}
                      color={quickAddColor('website')}
                      icon={quickAddIcon('website')}
                      title={`${t('onboarding.contactInfo.website')} #${index + 1}`}
                      removeLabel={t('onboarding.contactInfo.remove')}
                      onRemove={
                        readOnly ? undefined : () => requestRemoveEntry('website', site.id)
                      }
                    >
                      <Input ui={{ uid: "profile.contact-info.primary-contact-view.input.4-n4YYrj", id: "profile.contact-info.primary-contact-view.input.4" }}
                        value={site.url}
                        onChange={(e) => updateWebsite(site.id, { url: e.target.value })}
                        placeholder={t('onboarding.contactInfo.websitePlaceholder')}
                        type="url"
                        disabled={readOnly}
                      />
                    </ContactEntryCard>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </CardContent>

          <ConfirmDialog id="profile.contact-info.primary-contact-view.confirm-dialog"
            open={pendingRemoval !== null}
            title={t('onboarding.contactInfo.removeConfirm.title')}
            message={t('onboarding.contactInfo.removeConfirm.message')}
            confirmLabel={t('onboarding.contactInfo.removeConfirm.confirm')}
            cancelLabel={t('common.cancel')}
            tone="destructive"
            onConfirm={confirmRemoveEntry}
            onOpenChange={(open) => {
              if (!open) cancelRemoveEntry();
            }}
          />
        </Card>
      );
}
