'use client';

import * as React from 'react';
import { Plus, X, Phone, MessageCircle, Mail, Globe, Share2, ChevronDown, Lock, Smartphone, MapPin } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faEnvelope, faGlobe, faLocationDot, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AsolMap, markerAt, createOpenStreetMapProvider, createNativePlatformGpsProvider } from '@asol/map-core';
import type { LocationEntry } from '@/features/profile/entities/profile-contacts.entity';
import { getContactVisualColor, getContactVisualIcon } from "../contact-visual-style";
import { shareLocationUrl } from "@/features/sharing/share-location-url";
import { SOCIAL_PLATFORMS, PHONE_TYPES, SocialLink, PhoneLink, ContactInfoData, ContactInfoCardProps, tileProvider, gpsProvider, normalizeContactInfoData, quickAddColor, quickAddIcon, ContactQuickAddGrid } from "./ContactInfoCard.contact-types";
import type { ContactInfoCardModel } from "./ContactInfoCard.model";
import { geoLocationUrl, googleMapsSearchUrl } from "./contact-location-links";
import { ContactSectionHeader } from "./ContactSectionHeader";

export function AdditionalContactView({ model }: { model: ContactInfoCardModel }) {
const { data, onChange, readOnly, hidePrimarySection, t, locale, shouldWrapInCard, localData, setLocalData, isPasswordOpen, setIsPasswordOpen, passwordData, setPasswordData, openMapId, setOpenMapId, mapMessages, setMapMessages, updateField, addPhone, updatePhone, removePhone, addAnotherPhone, phonesForAdditional, groupedPhones, addedPhoneTypes, availablePhoneTypes, hasAdditionalEmails, hasWebsites, handleAddItem, addWebsite, updateWebsite, removeWebsite, addEmail, updateEmail, removeEmail, addSocialLink, updateSocialLink, removeSocialLink, addAnotherLink, addLocation, updateLocationEntry, removeLocation, setMapMessage, addedPlatforms, availablePlatforms, quickAddItems, groupedSocialLinks } = model;
return (
        /* Additional Contact Section without outer Card */
        <>
          <div className="mb-6 flex items-center justify-between">
            <ContactSectionHeader
              icon={Share2}
              title={t('onboarding.contactInfo.additionalContact')}
              description={t('onboarding.contactInfo.additionalContactHint')}
            />
          </div>

          <div className="space-y-4">
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
                    <span className="text-sm font-semibold" style={{ color: quickAddColor(type) }}>
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
                      <div
                        key={phone.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
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
                          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant select-none">
                            +20
                          </span>
                          <input
                            type="tel"
                            inputMode="tel"
                            maxLength={11}
                            placeholder={t('auth.login.phonePlaceholder')}
                            className="auth-input ps-12 w-full"
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

            {/* Additional Emails */}
            {localData.emails.filter((e) => e.id !== 'primary').length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <FontAwesomeIcon icon={quickAddIcon('email')} className="h-4 w-4" style={{ color: quickAddColor('email') }} />
                    <span style={{ color: quickAddColor('email') }}>{t('onboarding.contactInfo.emails')}</span>
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
                    <Button
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

            {/* Locations */}
            {localData.locations.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <FontAwesomeIcon icon={quickAddIcon('location')} className="h-4 w-4" style={{ color: quickAddColor('location') }} />
                    <span style={{ color: quickAddColor('location') }}>{locale === 'ar' ? 'المواقع' : 'Locations'}</span>
                  </span>
                </div>
                
                <div className="space-y-4">
                  {localData.locations.map((loc, idx) => (
                    <div
                      key={loc.id}
                      className="space-y-3 rounded-xl border p-4"
                      style={{
                        backgroundColor: `${quickAddColor('location')}10`,
                        borderColor: `${quickAddColor('location')}44`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: quickAddColor('location') }}>
                          <FontAwesomeIcon icon={quickAddIcon('location')} className="h-3.5 w-3.5" />
                          {locale === 'ar' ? `الموقع #${idx + 1}` : `Location #${idx + 1}`}
                        </span>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLocation(loc.id)}
                            className="h-8 w-8 text-destructive"
                            aria-label={locale === 'ar' ? 'حذف الموقع' : 'Remove location'}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {!readOnly ? (
                        <div className="space-y-2">
                          {openMapId === loc.id ? (
                            <div className="space-y-2">
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
                                <p className="text-xs font-medium text-primary mt-1" role="status">
                                  {mapMessages[loc.id]}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setOpenMapId(loc.id)}
                              className="asol-control border border-input px-4 font-medium"
                            >
                              {locale === 'ar' ? 'تحديد الموقع على الخريطة' : 'Set location on map'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{loc.address || (locale === 'ar' ? 'بدون عنوان' : 'No address')}</div>
                          {loc.latitude && loc.longitude ? (
                            <a
                              href={geoLocationUrl(loc.latitude, loc.longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary"
                            >
                              <MapPin className="h-3 w-3" />
                              {locale === 'ar' ? 'فتح في الخرائط' : 'Open in maps'}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">
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
        </>
      );
}
