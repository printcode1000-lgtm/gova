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
import { geoLocationUrl, googleMapsSearchUrl } from "./contact-location-links";
import { ContactSectionHeader } from "./ContactSectionHeader";
import { ContactEntryCard } from "./ContactEntryCard";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { createOpaqueUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

export function AdditionalContactView({ model }: { model: ContactInfoCardModel }) {
const { data, onChange, readOnly, hidePrimarySection, t, locale, shouldWrapInCard, localData, setLocalData, isPasswordOpen, setIsPasswordOpen, passwordData, setPasswordData, openMapId, setOpenMapId, mapMessages, setMapMessages, updateField, addPhone, updatePhone, removePhone, addAnotherPhone, phonesForAdditional, groupedPhones, addedPhoneTypes, availablePhoneTypes, hasAdditionalEmails, hasWebsites, handleAddItem, addWebsite, updateWebsite, removeWebsite, addEmail, updateEmail, removeEmail, addSocialLink, updateSocialLink, removeSocialLink, addAnotherLink, addLocation, updateLocationEntry, removeLocation, setMapMessage, addedPlatforms, availablePlatforms, quickAddItems, selectedKindId, selectContactKind, activeKindId, pendingRemoval, requestRemoveEntry, cancelRemoveEntry, confirmRemoveEntry, groupedSocialLinks } = model;
const phoneLabels = phoneFieldLabels(t, locale);
return (
        /* Additional Contact Section without outer Card */
        <>
          <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.13-C1IpzF", id: "profile.contact-info.additional-contact-view.div.13" })} id="profile.contact-info.additional-contact-view.div" className="mb-6 flex items-center justify-between">
            <ContactSectionHeader id="profile.contact-info.additional-contact-view.contact-section-header"
              icon={Share2}
              title={t('onboarding.contactInfo.additionalContact')}
              description={t('onboarding.contactInfo.additionalContactHint')}
            />
          </div>

          <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.14-9KQpSH", id: "profile.contact-info.additional-contact-view.div.14" })} id="profile.contact-info.additional-contact-view.div.2" className="space-y-4">
            {!readOnly && (
              <ContactQuickAddGrid id="profile.contact-info.additional-contact-view.contact-quick-add-grid"
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
                <div key={type} {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.15-5uU765", id: "profile.contact-info.additional-contact-view.div.15" , instance: createOpaqueUiInstanceId("iter-f0858785af", String(type))})} className="space-y-2">
                  <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.16-0SJTgu", id: "profile.contact-info.additional-contact-view.div.16" , instance: createOpaqueUiInstanceId("iter-f3a666d710", String(type))})} className="flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={quickAddIcon(type)}
                      className="h-4 w-4"
                      style={{ color: quickAddColor(type) }}
                    />
                    <span {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.span.7-i8Aar6", id: "profile.contact-info.additional-contact-view.span.7" , instance: createOpaqueUiInstanceId("iter-2a49607ecc", String(type))})} className="text-sm font-semibold" style={{ color: quickAddColor(type) }}>
                      {t(`onboarding.contactInfo.phoneTypes.${type}`)}
                    </span>
                    {!readOnly && (
                      <Button ui={{ uid: "profile.contact-info.additional-contact-view.button.4-dR4MfM", id: "profile.contact-info.additional-contact-view.button.4" , instance: createOpaqueUiInstanceId("iter-7272438e8e", String(type))}}
                        variant="outline"
                        size="sm"
                        onClick={() => addAnotherPhone(type)}
                        className="gap-1 h-6 px-2 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.17-zPOR6U", id: "profile.contact-info.additional-contact-view.div.17" , instance: createOpaqueUiInstanceId("iter-414abc51f9", String(type))})} className="space-y-2">
                    {typePhones.map((phone, index) => (
                      <ContactEntryCard
                        key={phone.id}
                        instance={createOpaqueUiInstanceId("contact-phone", phone.id)}
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
                        <PhoneField ui={{ uid: "profile.contact-info.additional-contact-view.phone-field-pP5K5X", id: "profile.contact-info.additional-contact-view.phone-field", instance: createOpaqueUiInstanceId("contact-phone", phone.id) }}
                          labels={phoneLabels}
                          inputClassName="auth-input w-full"
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
              <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.18-B6oeg1", id: "profile.contact-info.additional-contact-view.div.18" })} id="profile.contact-info.additional-contact-view.div.3" className="space-y-2">
                <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.19-4kJKcV", id: "profile.contact-info.additional-contact-view.div.19" })} id="profile.contact-info.additional-contact-view.div.4" className="flex items-center gap-2">
                  <span {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.span.8-Ln6FON", id: "profile.contact-info.additional-contact-view.span.8" })} id="profile.contact-info.additional-contact-view.span" className="text-sm font-semibold flex items-center gap-2">
                    <FontAwesomeIcon id="profile.contact-info.additional-contact-view.font-awesome-icon" icon={quickAddIcon('email')} className="h-4 w-4" style={{ color: quickAddColor('email') }} />
                    <span {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.span.9-26cOEC", id: "profile.contact-info.additional-contact-view.span.9" })} id="profile.contact-info.additional-contact-view.span.2" style={{ color: quickAddColor('email') }}>{t('onboarding.contactInfo.emails')}</span>
                  </span>
                  {!readOnly && (
                    <Button id="profile.contact-info.additional-contact-view.button" ui={{ uid: 'profile.additional-contact.add-email-aSN14x', id: 'profile.additional-contact.add-email', kind: 'action', action: 'add-email', part: 'emails' }}
                      variant="outline"
                      size="sm"
                      onClick={addEmail}
                      className="gap-1 h-6 px-2 text-xs"
                    >
                      <Plus id="profile.contact-info.additional-contact-view.plus" className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.20-FTy9fE", id: "profile.contact-info.additional-contact-view.div.20" })} id="profile.contact-info.additional-contact-view.div.5" className="space-y-2">
                  {localData.emails.filter((e) => e.id !== 'primary').map((emailLink, index) => (
                    <ContactEntryCard
                      key={emailLink.id}
                        instance={createOpaqueUiInstanceId("contact-email", emailLink.id)}
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
                      <Input ui={{ uid: "profile.contact-info.additional-contact-view.input-YsQo6o", id: "profile.contact-info.additional-contact-view.input", instance: createOpaqueUiInstanceId("contact-email", emailLink.id) }}
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
              <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.21-v5Q8VY", id: "profile.contact-info.additional-contact-view.div.21" })} id="profile.contact-info.additional-contact-view.div.6" className="space-y-4">
                {SOCIAL_PLATFORMS.map((platform) => {
                  if (platform !== activeKindId) return null;
                  const platformLinks = groupedSocialLinks[platform];
                  if (!platformLinks || platformLinks.length === 0) return null;

                  return (
                    <div key={platform} {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.22-6AhWCr", id: "profile.contact-info.additional-contact-view.div.22" , instance: createOpaqueUiInstanceId("iter-f7a8c4f4bb", String(platform))})} className="space-y-2">
                      <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.23-k8ufCF", id: "profile.contact-info.additional-contact-view.div.23" , instance: createOpaqueUiInstanceId("iter-555c9273a5", String(platform))})} className="flex items-center gap-2">
                        <FontAwesomeIcon
                          icon={quickAddIcon(platform)}
                          className="h-4 w-4"
                          style={{ color: quickAddColor(platform) }}
                        />
                        <span {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.span.10-TIRfy2", id: "profile.contact-info.additional-contact-view.span.10" , instance: createOpaqueUiInstanceId("iter-4ffdea704a", String(platform))})} className="text-sm font-semibold" style={{ color: quickAddColor(platform) }}>
                          {t(`onboarding.contactInfo.platforms.${platform}`)}
                        </span>
                        {!readOnly && (
                          <Button ui={{ uid: "profile.contact-info.additional-contact-view.button.5-HYa46Q", id: "profile.contact-info.additional-contact-view.button.5" , instance: createOpaqueUiInstanceId("iter-00957e1452", String(platform))}}
                            variant="outline"
                            size="sm"
                            onClick={() => addAnotherLink(platform)}
                            className="gap-1 h-6 px-2 text-xs"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.24-KQR0uO", id: "profile.contact-info.additional-contact-view.div.24" , instance: createOpaqueUiInstanceId("iter-37e3f93a8d", String(platform))})} className="space-y-2">
                        {platformLinks.map((link, index) => (
                          <ContactEntryCard
                            key={link.id}
                        instance={createOpaqueUiInstanceId("contact-social", link.id)}
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
                            <Input ui={{ uid: "profile.contact-info.additional-contact-view.input.2-H34dKX", id: "profile.contact-info.additional-contact-view.input.2", instance: createOpaqueUiInstanceId("contact-social", link.id) }}
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
              <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.25-1xLBte", id: "profile.contact-info.additional-contact-view.div.25" })} id="profile.contact-info.additional-contact-view.div.7" className="space-y-2">
                <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.26-U4zFcZ", id: "profile.contact-info.additional-contact-view.div.26" })} id="profile.contact-info.additional-contact-view.div.8" className="flex items-center gap-2">
                  <span {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.span.11-711nBC", id: "profile.contact-info.additional-contact-view.span.11" })} id="profile.contact-info.additional-contact-view.span.3" className="text-sm font-semibold flex items-center gap-2">
                    <FontAwesomeIcon id="profile.contact-info.additional-contact-view.font-awesome-icon.2" icon={quickAddIcon('website')} className="h-4 w-4" style={{ color: quickAddColor('website') }} />
                    <span {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.span.12-lD3iOY", id: "profile.contact-info.additional-contact-view.span.12" })} id="profile.contact-info.additional-contact-view.span.4" style={{ color: quickAddColor('website') }}>{t('onboarding.contactInfo.websites')}</span>
                  </span>
                  {!readOnly && (
                    <Button id="profile.contact-info.additional-contact-view.button.2" ui={{ uid: 'profile.additional-contact.add-website-B3XH9C', id: 'profile.additional-contact.add-website', kind: 'action', action: 'add-website', part: 'websites' }}
                      variant="outline"
                      size="sm"
                      onClick={addWebsite}
                      className="gap-1 h-6 px-2 text-xs"
                    >
                      <Plus id="profile.contact-info.additional-contact-view.plus.2" className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.27-ERDg5f", id: "profile.contact-info.additional-contact-view.div.27" })} id="profile.contact-info.additional-contact-view.div.9" className="space-y-2">
                  {localData.websites.map((site, index) => (
                    <ContactEntryCard
                      key={site.id}
                        instance={createOpaqueUiInstanceId("contact-website", site.id)}
                      color={quickAddColor('website')}
                      icon={quickAddIcon('website')}
                      title={`${t('onboarding.contactInfo.website')} #${index + 1}`}
                      removeLabel={t('onboarding.contactInfo.remove')}
                      onRemove={
                        readOnly ? undefined : () => requestRemoveEntry('website', site.id)
                      }
                    >
                      <Input ui={{ uid: "profile.contact-info.additional-contact-view.input.3-h8RXDE", id: "profile.contact-info.additional-contact-view.input.3", instance: createOpaqueUiInstanceId("contact-website", site.id) }}
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

            {/* Locations */}
            {activeKindId === 'location' && localData.locations.length > 0 && (
              <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.28-4VJIF4", id: "profile.contact-info.additional-contact-view.div.28" })} id="profile.contact-info.additional-contact-view.div.10" className="space-y-4">
                <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.29-BtTU4d", id: "profile.contact-info.additional-contact-view.div.29" })} id="profile.contact-info.additional-contact-view.div.11" className="flex items-center gap-2">
                  <span {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.span.13-6YJFI0", id: "profile.contact-info.additional-contact-view.span.13" })} id="profile.contact-info.additional-contact-view.span.5" className="text-sm font-semibold flex items-center gap-2">
                    <FontAwesomeIcon id="profile.contact-info.additional-contact-view.font-awesome-icon.3" icon={quickAddIcon('location')} className="h-4 w-4" style={{ color: quickAddColor('location') }} />
                    <span {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.span.14-B4Q540", id: "profile.contact-info.additional-contact-view.span.14" })} id="profile.contact-info.additional-contact-view.span.6" style={{ color: quickAddColor('location') }}>{locale === 'ar' ? 'المواقع' : 'Locations'}</span>
                  </span>
                  {!readOnly && (
                    <Button id="profile.contact-info.additional-contact-view.button.3" ui={{ uid: 'profile.additional-contact.add-location-9GF5zT', id: 'profile.additional-contact.add-location', kind: 'action', action: 'add-location', part: 'locations' }}
                      variant="outline"
                      size="sm"
                      onClick={addLocation}
                      className="gap-1 h-6 px-2 text-xs"
                      aria-label={locale === 'ar' ? 'إضافة موقع آخر' : 'Add another location'}
                    >
                      <Plus id="profile.contact-info.additional-contact-view.plus.3" className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.30-3o5nW3", id: "profile.contact-info.additional-contact-view.div.30" })} id="profile.contact-info.additional-contact-view.div.12" className="space-y-4">
                  {localData.locations.map((loc, idx) => (
                    <div
                      key={loc.id} {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.31-hZ4jcz", id: "profile.contact-info.additional-contact-view.div.31" , instance: createOpaqueUiInstanceId("iter-b07dbc5b73", String(loc.id))})}
                      className="space-y-3 rounded-xl border p-4"
                      style={{
                        backgroundColor: `${quickAddColor('location')}10`,
                        borderColor: `${quickAddColor('location')}44`,
                      }}
                    >
                      <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.32-Hjyy2n", id: "profile.contact-info.additional-contact-view.div.32" , instance: createOpaqueUiInstanceId("iter-231a9da029", String(loc.id))})} className="flex items-center justify-between gap-3">
                        <span {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.span.15-sRW8Ey", id: "profile.contact-info.additional-contact-view.span.15" , instance: createOpaqueUiInstanceId("iter-b7c04b731e", String(loc.id))})} className="flex items-center gap-2 text-xs font-semibold" style={{ color: quickAddColor('location') }}>
                          <FontAwesomeIcon icon={quickAddIcon('location')} className="h-3.5 w-3.5" />
                          {locale === 'ar' ? `الموقع #${idx + 1}` : `Location #${idx + 1}`}
                        </span>
                        {!readOnly && (
                          <Button ui={{ uid: "profile.contact-info.additional-contact-view.button.6-zLOQ6S", id: "profile.contact-info.additional-contact-view.button.6" , instance: createOpaqueUiInstanceId("iter-71bfac1496", String(loc.id))}}
                            variant="ghost"
                            size="icon"
                            onClick={() => requestRemoveEntry('location', loc.id)}
                            className="h-8 w-8 text-destructive"
                            aria-label={locale === 'ar' ? 'إزالة الموقع' : 'Remove location'}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {!readOnly ? (
                        <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.33-7PANzd", id: "profile.contact-info.additional-contact-view.div.33" , instance: createOpaqueUiInstanceId("iter-e80dbf4d03", String(loc.id))})} className="space-y-2">
                          {openMapId === loc.id ? (
                            <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.34-0SJ1a3", id: "profile.contact-info.additional-contact-view.div.34" , instance: createOpaqueUiInstanceId("iter-ff102c39f9", String(loc.id))})} className="space-y-2">
                              <AsolMap
                                id={`map-${loc.id}`}
                                modes={['picker']}
                                providers={{
                                  tile: tileProvider,
                                  gps: gpsProvider,
                                }}
                                initialViewport={
                                  loc.latitude && loc.longitude
                                    ? {
                                        latitude: loc.latitude,
                                        longitude: loc.longitude,
                                        zoom: 15,
                                        bearing: 0,
                                        pitch: 0,
                                      }
                                    : { latitude: 29.9668, longitude: 32.5498, zoom: 11, bearing: 0, pitch: 0 }
                                }
                                markers={
                                  loc.latitude && loc.longitude
                                    ? [markerAt(loc.longitude, loc.latitude, loc.id)]
                                    : []
                                }
                                toolbar={{
                                  gps: { enabled: true, label: locale === 'ar' ? 'تحديد الموقع الحالي' : 'Locate me' },
                                  share: { enabled: true, label: locale === 'ar' ? 'مشاركة الموقع' : 'Share location' },
                                  reset: { enabled: true, label: locale === 'ar' ? 'إعادة الضبط' : 'Reset' },
                                  close: { enabled: true, label: locale === 'ar' ? 'إغلاق الخريطة' : 'Close map' },
                                  recenter: { enabled: true, label: locale === 'ar' ? 'إعادة التمركز' : 'Recenter' },
                                  zoom: { enabled: true, label: locale === 'ar' ? 'التكبير والتصغير' : 'Zoom' },
                                  compass: { enabled: true, label: locale === 'ar' ? 'إعادة اتجاه الشمال' : 'North' },
                                  fullscreen: { enabled: true, label: locale === 'ar' ? 'ملء الشاشة' : 'Fullscreen' },
                                }}
                                layers={{ baseMap: true, markers: true, controls: true }}
                                ariaLabel={locale === 'ar' ? 'اختيار موقع المتجر' : 'Pick store location'}
                                loadingLabel={locale === 'ar' ? 'جارٍ تحميل الخريطة…' : 'Loading map…'}
                                retryLabel={locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                                addressPrompt={{
                                  enabled: true,
                                  title: locale === 'ar' ? 'عنوان هذا الموقع' : 'Address for this location',
                                  placeholder: locale === 'ar' ? 'اكتب وصف العنوان' : 'Describe this location',
                                  confirmLabel: locale === 'ar' ? 'تأكيد' : 'Confirm',
                                  cancelLabel: locale === 'ar' ? 'إلغاء' : 'Cancel',
                                  value: loc.address || '',
                                }}
                                onTap={({ latitude: lat, longitude: lng }) =>
                                  updateLocationEntry(loc.id, { latitude: lat, longitude: lng })
                                }
                                onGpsCompleted={({ latitude: lat, longitude: lng }) =>
                                  updateLocationEntry(loc.id, { latitude: lat, longitude: lng })
                                }
                                onLocationCommitted={({ latitude: lat, longitude: lng, address }) =>
                                  updateLocationEntry(loc.id, { latitude: lat, longitude: lng, address })
                                }
                                onGpsError={(mapError) =>
                                  setMapMessage(
                                    loc.id,
                                    mapError.code !== 'permission'
                                      ? (locale === 'ar' ? 'تعذر تحديد موقعك الحالي. حدد الموقع على الخريطة.' : 'Could not read your location. Pick it on the map instead.')
                                      : mapError.requiresSettings
                                        ? (locale === 'ar' ? 'إذن الموقع محظور. فعّله من إعدادات التطبيق ثم أعد المحاولة.' : 'Location permission is blocked. Enable it in app settings, then retry.')
                                        : mapError.permissionState === 'unsupported'
                                          ? (locale === 'ar' ? 'تحديد الموقع غير مدعوم على هذا الجهاز. حدد الموقع على الخريطة.' : 'Location is unsupported on this device. Pick it on the map instead.')
                                          : (locale === 'ar' ? 'لم يُمنح إذن الموقع. اسمح بالوصول أو حدد الموقع على الخريطة.' : 'Location permission was not granted. Allow access, or pick it on the map.'),
                                  )
                                }
                                onShare={({ latitude: lat, longitude: lng }) => {
                                  const url = googleMapsSearchUrl(lat, lng);
                                  void shareLocationUrl(
                                    url,
                                    locale === 'ar' ? 'موقع المتجر' : 'Store location',
                                    () =>
                                      setMapMessage(
                                        loc.id,
                                        locale === 'ar' ? 'تم نسخ رابط الموقع.' : 'Location link copied.',
                                      ),
                                  )
                                }}
                                onReset={() => {
                                  updateLocationEntry(loc.id, { address: '', latitude: 0, longitude: 0 });
                                  setMapMessage(loc.id, locale === 'ar' ? 'تمت إعادة ضبط الموقع.' : 'Location reset.');
                                }}
                                onClose={() => setOpenMapId(null)}
                              />
                              {mapMessages[loc.id] && (
                                <p {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.p-2x9W6D", id: "profile.contact-info.additional-contact-view.p" , instance: createOpaqueUiInstanceId("iter-8ac0c4ee9c", String(loc.id))})} className="text-xs font-medium text-primary mt-1" role="status">
                                  {mapMessages[loc.id]}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.button.7-i04oH8", id: "profile.contact-info.additional-contact-view.button.7" , instance: createOpaqueUiInstanceId("iter-00cc31f312", String(loc.id))})}
                              type="button"
                              onClick={() => setOpenMapId(loc.id)}
                              className="asol-control border border-input px-4 font-medium"
                            >
                              {locale === 'ar' ? 'تحديد الموقع على الخريطة' : 'Set location on map'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.35-Xawx4W", id: "profile.contact-info.additional-contact-view.div.35" , instance: createOpaqueUiInstanceId("iter-f4448a6d15", String(loc.id))})} className="space-y-1">
                          <div {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.div.36-FVb18O", id: "profile.contact-info.additional-contact-view.div.36" , instance: createOpaqueUiInstanceId("iter-e9069ab33d", String(loc.id))})} className="text-sm font-medium">{loc.address || (locale === 'ar' ? 'بدون عنوان' : 'No address')}</div>
                          {loc.latitude && loc.longitude ? (
                            <a {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.a-OYr0yo", id: "profile.contact-info.additional-contact-view.a" , instance: createOpaqueUiInstanceId("iter-40a2feeffd", String(loc.id))})}
                              href={geoLocationUrl(loc.latitude, loc.longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary"
                            >
                              <MapPin className="h-3 w-3" />
                              {locale === 'ar' ? 'فتح في الخرائط' : 'Open in maps'}
                            </a>
                          ) : (
                            <span {...uiAttributes({ uid: "profile.contact-info.additional-contact-view.span.16-0GmKt9", id: "profile.contact-info.additional-contact-view.span.16" , instance: createOpaqueUiInstanceId("iter-11e407ab29", String(loc.id))})} className="text-xs text-muted-foreground">
                              {locale === 'ar' ? 'لم يتم تحديد موقع جغرافي' : 'No coordinates selected'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ConfirmDialog id="profile.contact-info.additional-contact-view.confirm-dialog"
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
        </>
      );
}
