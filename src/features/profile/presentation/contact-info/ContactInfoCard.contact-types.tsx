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

export const SOCIAL_PLATFORMS = [
  'instagram',
  'facebook',
  'twitter',
  'tiktok',
  'youtube',
  'pinterest',
] as const;

export const PHONE_TYPES = [
  'whatsapp',
  'phone',
  'fax',
  'telegram',
  'viber',
] as const;

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface WebsiteLink {
  id: string;
  url: string;
}

export interface EmailLink {
  id: string;
  email: string;
  isPrimary: boolean;
}

export interface PhoneLink {
  id: string;
  number: string;
  type: string;
}

export interface ContactInfoData {
  phones: PhoneLink[];
  emails: EmailLink[];
  websites: WebsiteLink[];
  socialLinks: SocialLink[];
  locations: LocationEntry[];
}

export interface ContactInfoCardProps {
  data?: ContactInfoData;
  onChange?: (data: ContactInfoData) => void;
  readOnly?: boolean;
  /** Hide primary phone/email/password — use ProfileRegistrationInfoCard on profile page */
  hidePrimarySection?: boolean;
}

export interface ContactQuickAddItem {
  id: string;
  label: string;
  icon: IconDefinition;
  available: boolean;
  badge?: string;
}

export const tileProvider = createOpenStreetMapProvider();

export const gpsProvider = createNativePlatformGpsProvider();

export function asArray<T>(value: T[] | unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export function normalizeContactInfoData(data: ContactInfoData): ContactInfoData {
  return {
    phones: asArray<PhoneLink>(data.phones).map((phone, index) => ({
      ...phone,
      id: phone.id || `phone-${index}`,
    })),
    emails: asArray<EmailLink>(data.emails).map((email, index) => ({
      ...email,
      id: email.id || `email-${index}`,
    })),
    websites: asArray<WebsiteLink>(data.websites).map((site, index) => ({
      ...site,
      id: site.id || `website-${index}`,
    })),
    socialLinks: asArray<SocialLink>(data.socialLinks).map((link, index) => ({
      ...link,
      id: link.id || `${link.platform}-${index}`,
    })),
    locations: asArray<LocationEntry>(data.locations),
  };
}

export function quickAddColor(id: string): string {
  return getContactVisualColor(id);
}

export function quickAddIcon(id: string): IconDefinition {
  return getContactVisualIcon(id);
}

export function ContactQuickAddGrid({
  items,
  onAdd,
  title,
  emptyText,
}: {
  items: ContactQuickAddItem[];
  onAdd: (id: string) => void;
  title: string;
  emptyText: string;
}) {
  const visibleItems = items.filter((item) => item.available);
  const completedItems = items.filter((item) => !item.available);

  return (
    <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-on-surface">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          </span>
          {title}
        </p>
        {completedItems.length > 0 ? (
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
            {completedItems.length}
          </span>
        ) : null}
      </div>

      {visibleItems.length > 0 ? (
        <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onAdd(item.id)}
              className="group relative flex min-h-14 w-[4.25rem] shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-lg border px-0.5 py-1 text-center shadow-sm transition-all active:scale-95 sm:w-[4.25rem]"
              style={{
                background: `linear-gradient(135deg, ${getContactVisualColor(item.id)}1F, ${getContactVisualColor(item.id)}08)`,
                borderColor: `${getContactVisualColor(item.id)}55`,
              }}
            >
              {item.badge ? (
                <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-on-primary shadow-sm">
                  {item.badge}
                </span>
              ) : null}
              <FontAwesomeIcon
                icon={item.icon}
                className="h-6 w-6 transition-transform"
                style={{ color: getContactVisualColor(item.id) }}
              />
              <span
                className="line-clamp-2 w-[4.5rem] origin-top scale-[0.75] text-center text-[10px] font-semibold leading-[11px] tracking-tight text-muted-foreground"
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-surface px-3 py-2 text-xs text-on-surface-variant">
          {emptyText}
        </p>
      )}

      {completedItems.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {completedItems.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-on-surface-variant"
            >
              <FontAwesomeIcon icon={item.icon} className="h-3 w-3" />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
