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

export function PrimaryContactView({ model }: { model: ContactInfoCardModel }) {
const { data, onChange, readOnly, hidePrimarySection, t, locale, shouldWrapInCard, localData, setLocalData, isPasswordOpen, setIsPasswordOpen, passwordData, setPasswordData, openMapId, setOpenMapId, mapMessages, setMapMessages, updateField, addPhone, updatePhone, removePhone, addAnotherPhone, phonesForAdditional, groupedPhones, addedPhoneTypes, availablePhoneTypes, hasAdditionalEmails, hasWebsites, handleAddItem, addWebsite, updateWebsite, removeWebsite, addEmail, updateEmail, removeEmail, addSocialLink, updateSocialLink, removeSocialLink, addAnotherLink, addLocation, updateLocationEntry, removeLocation, setMapMessage, addedPlatforms, availablePlatforms, quickAddItems, selectedKindId, selectContactKind, activeKindId, pendingRemoval, requestRemoveEntry, cancelRemoveEntry, confirmRemoveEntry, groupedSocialLinks } = model;
const phoneLabels = phoneFieldLabels(t, locale);
return (
        <Card id='profile-presentation-contact-info-primarycontactview-card-1-7b5dxj'>
          <CardHeader id='profile-presentation-contact-info-primarycontactview-cardheader-2-71y27c'>
            <CardTitle id='profile-presentation-contact-info-primarycontactview-cardtitle-3-q9uamc'>{t('onboarding.contactInfo.title')}</CardTitle>
            <CardDescription id='profile-presentation-contact-info-primarycontactview-carddescription-4-shte1d'>{t('onboarding.contactInfo.description')}</CardDescription>
          </CardHeader>
          <CardContent id='profile-presentation-contact-info-primarycontactview-cardcontent-5-twrunn' className="space-y-6">
            {/* Primary Contact Section */}
            <Card id='profile-presentation-contact-info-primarycontactview-card-6-ebffo5'>
              <CardHeader id='profile-presentation-contact-info-primarycontactview-cardheader-7-gr88k3'>
                <ContactSectionHeader id='profile-presentation-contact-info-primarycontactview-contactsectionheader-8-n92qel'
                  icon={Phone}
                  title={t('onboarding.contactInfo.primaryContact')}
                  description={t('onboarding.contactInfo.primaryContactHint')}
                />
              </CardHeader>
              <CardContent id='profile-presentation-contact-info-primarycontactview-cardcontent-9-7v65nm' className="space-y-4">
                {/* Primary WhatsApp */}
                <div id='profile-presentation-contact-info-primarycontactview-div-10-xknvvi' className="space-y-2">
                  <Label id='profile-presentation-contact-info-primarycontactview-label-11-4bmkbs' className="text-sm font-semibold flex items-center gap-2 text-on-surface">
                    <MessageCircle id='profile-presentation-contact-info-primarycontactview-messagecircle-12-4z2ves' className="h-4 w-4 text-primary" />
                    {t('onboarding.contactInfo.phoneTypes.whatsapp')}
                  </Label>
                  <PhoneField id='profile-presentation-contact-info-primarycontactview-phonefield-13-sqffdn'
                    labels={phoneLabels}
                    inputClassName="auth-input w-full"
                    value={localData.phones.find((p) => p.id === 'primary-whatsapp')?.number || ''}
                    onChange={(number) => updatePhone('primary-whatsapp', { number })}
                    disabled={readOnly}
                  />
                </div>

                {/* Primary Email */}
                <div id='profile-presentation-contact-info-primarycontactview-div-14-bspsf7' className="space-y-2">
                  <Label id='profile-presentation-contact-info-primarycontactview-label-15-gq44eg' className="text-sm font-medium flex items-center gap-2">
                    <Mail id='profile-presentation-contact-info-primarycontactview-mail-16-nlenif' className="h-4 w-4 text-muted-foreground" />
                    {t('onboarding.contactInfo.email')}
                  </Label>
                  <Input id='profile-presentation-contact-info-primarycontactview-input-17-z2tatz'
                    value={localData.emails.find((e) => e.id === 'primary')?.email || ''}
                    onChange={(e) => updateEmail('primary', { email: e.target.value })}
                    placeholder={t('onboarding.contactInfo.emailPlaceholder')}
                    type="email"
                    disabled={readOnly}
                  />
                </div>

                {/* Password Change Section */}
                {!readOnly && (
                  <div id='profile-presentation-contact-info-primarycontactview-div-18-06ud7z' className="space-y-2">
                    <Button id='profile-presentation-contact-info-primarycontactview-button-19-ix1zy3'
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => setIsPasswordOpen(!isPasswordOpen)}
                    >
                      <Lock id='profile-presentation-contact-info-primarycontactview-lock-20-a9pnsf' className="h-4 w-4" />
                      {t('onboarding.contactInfo.changePassword')}
                      <ChevronDown id='profile-presentation-contact-info-primarycontactview-chevrondown-21-vlnmfc' className={`h-4 w-4 transition-transform ${isPasswordOpen ? 'rotate-180' : ''}`} />
                    </Button>
                    {isPasswordOpen && (
                      <div id='profile-presentation-contact-info-primarycontactview-div-22-zcxcyx' className="space-y-4 pt-4">
                        <div id='profile-presentation-contact-info-primarycontactview-div-23-ljipcj' className="space-y-2">
                          <Label id='profile-presentation-contact-info-primarycontactview-label-24-k0amoe' htmlFor='profile-presentation-contact-info-primarycontactview-input-25-tgc1ve'>{t('onboarding.contactInfo.currentPassword')}</Label>
                          <Input
                            id='profile-presentation-contact-info-primarycontactview-input-25-tgc1ve'
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: foldPasswordDigits(e.target.value) })}
                            placeholder={t('onboarding.contactInfo.currentPasswordPlaceholder')}
                          />
                        </div>
                        <div id='profile-presentation-contact-info-primarycontactview-div-26-58wqrc' className="space-y-2">
                          <Label id='profile-presentation-contact-info-primarycontactview-label-27-qqxn1t' htmlFor='profile-presentation-contact-info-primarycontactview-input-28-8h7bqg'>{t('onboarding.contactInfo.newPassword')}</Label>
                          <Input
                            id='profile-presentation-contact-info-primarycontactview-input-28-8h7bqg'
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: foldPasswordDigits(e.target.value) })}
                            placeholder={t('onboarding.contactInfo.newPasswordPlaceholder')}
                          />
                        </div>
                        <div id='profile-presentation-contact-info-primarycontactview-div-29-gdkins' className="space-y-2">
                          <Label id='profile-presentation-contact-info-primarycontactview-label-30-cvxedy' htmlFor='profile-presentation-contact-info-primarycontactview-input-31-sqzn1d'>{t('onboarding.contactInfo.confirmPassword')}</Label>
                          <Input
                            id='profile-presentation-contact-info-primarycontactview-input-31-sqzn1d'
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
            <Card id='profile-presentation-contact-info-primarycontactview-card-32-3nff19'>
              <CardHeader id='profile-presentation-contact-info-primarycontactview-cardheader-33-lpvhim'>
                <div id='profile-presentation-contact-info-primarycontactview-div-34-y8fhxb' className="flex items-center justify-between">
                  <div id='profile-presentation-contact-info-primarycontactview-div-35-qz5ik7'>
                    <CardTitle id='profile-presentation-contact-info-primarycontactview-cardtitle-36-rlxhab' className="text-base flex items-center gap-2">
                      <Share2 id='profile-presentation-contact-info-primarycontactview-share2-37-6eiwgh' className="h-4 w-4 text-muted-foreground" />
                      {t('onboarding.contactInfo.additionalContact')}
                    </CardTitle>
                    <CardDescription id='profile-presentation-contact-info-primarycontactview-carddescription-38-hrbuoj' className="text-xs">{t('onboarding.contactInfo.additionalContactHint')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent id='profile-presentation-contact-info-primarycontactview-cardcontent-39-7kfnt8' className="space-y-3 sm:space-y-4">
                {!readOnly && (
                  <ContactQuickAddGrid id='profile-presentation-contact-info-primarycontactview-contactquickaddgrid-40-1c00yf'
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
                        <PhoneField
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
              <div id='profile-presentation-contact-info-primarycontactview-div-41-9t507i' className="space-y-2">
                <div id='profile-presentation-contact-info-primarycontactview-div-42-ryhjzr' className="flex items-center gap-2">
                  <span id='profile-presentation-contact-info-primarycontactview-text-43-rkdzrw' className="text-sm font-semibold flex items-center gap-2">
                    <FontAwesomeIcon id='profile-presentation-contact-info-primarycontactview-fontawesomeicon-44-fovopi' icon={quickAddIcon('email')} className="h-4 w-4" style={{ color: quickAddColor('email') }} />
                    <span id='profile-presentation-contact-info-primarycontactview-text-45-wbeehn' style={{ color: quickAddColor('email') }}>{t('onboarding.contactInfo.emails')}</span>
                  </span>
                  {!readOnly && (
                    <Button id='profile-presentation-contact-info-primarycontactview-button-46-0dtb8b'
                      variant="outline"
                      size="sm"
                      onClick={addEmail}
                      className="gap-1 h-6 px-2 text-xs"
                    >
                      <Plus id='profile-presentation-contact-info-primarycontactview-plus-47-gll5zo' className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div id='profile-presentation-contact-info-primarycontactview-div-48-42abzs' className="space-y-2">
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
                      <Input
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
              <div id='profile-presentation-contact-info-primarycontactview-div-49-tz1cz4' className="space-y-4">
                {SOCIAL_PLATFORMS.map((platform) => {
                  if (platform !== activeKindId) return null;
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
                            <Input
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
              <div id='profile-presentation-contact-info-primarycontactview-div-50-hlmppt' className="space-y-2">
                <div id='profile-presentation-contact-info-primarycontactview-div-51-1zxsxs' className="flex items-center gap-2">
                  <span id='profile-presentation-contact-info-primarycontactview-text-52-robhny' className="text-sm font-semibold flex items-center gap-2">
                    <FontAwesomeIcon id='profile-presentation-contact-info-primarycontactview-fontawesomeicon-53-6jhlbh' icon={quickAddIcon('website')} className="h-4 w-4" style={{ color: quickAddColor('website') }} />
                    <span id='profile-presentation-contact-info-primarycontactview-text-54-ozwrzk' style={{ color: quickAddColor('website') }}>{t('onboarding.contactInfo.websites')}</span>
                  </span>
                  {!readOnly && (
                    <Button id='profile-presentation-contact-info-primarycontactview-button-55-feqsad'
                      variant="outline"
                      size="sm"
                      onClick={addWebsite}
                      className="gap-1 h-6 px-2 text-xs"
                    >
                      <Plus id='profile-presentation-contact-info-primarycontactview-plus-56-8rscxt' className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div id='profile-presentation-contact-info-primarycontactview-div-57-cwhdvv' className="space-y-2">
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
                      <Input
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

          <ConfirmDialog id='profile-presentation-contact-info-primarycontactview-confirmdialog-58-dzjryh'
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
