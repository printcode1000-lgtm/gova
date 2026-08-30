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
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

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

/** The kinds of contact entry a card can hold, and a removal can name. */
export type ContactEntryKind =
  | 'phone'
  | 'email'
  | 'social'
  | 'website'
  | 'location';

export interface ContactQuickAddItem {
  id: string;
  label: string;
  icon: IconDefinition;
  /** How many entries of this kind the profile already holds. */
  count: number;
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

/**
 * The quick-add strip.
 *
 * Every contact kind stays on the strip for the life of the card, whether or
 * not the profile already holds one. Tapping a kind opens it: its card is the
 * only one shown below, and the add button inside that card is what adds
 * another entry of it. The badge counts what the profile already holds.
 */
export function ContactQuickAddGrid({ id,
  items,
  selectedId,
  onSelect,
  title,
}: {
  items: ContactQuickAddItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  title: string;
} & { id?: string }) {
  const addedCount = items.reduce((total, item) => total + item.count, 0);

  return (
    <div {...uiAttributes({ uid: "profile.contact-info.contact-info-card.contact-types.div-1fmNnR", id: "profile.contact-info.contact-info-card.contact-types.div" })} id={id} className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-3 sm:p-4">
      <div {...uiAttributes({ uid: "profile.contact-info.contact-info-card.contact-types.div.2-m979N4", id: "profile.contact-info.contact-info-card.contact-types.div.2" })} className="mb-3 flex items-center justify-between gap-3">
        <p {...uiAttributes({ uid: "profile.contact-info.contact-info-card.contact-types.p-q2qKMw", id: "profile.contact-info.contact-info-card.contact-types.p" })} className="flex items-center gap-2 text-sm font-bold text-on-surface">
          <span {...uiAttributes({ uid: "profile.contact-info.contact-info-card.contact-types.span-0KNBs1", id: "profile.contact-info.contact-info-card.contact-types.span" })} className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          </span>
          {title}
        </p>
        {addedCount > 0 ? (
          <span {...uiAttributes({ uid: "profile.contact-info.contact-info-card.contact-types.span.2-B4oGGo", id: "profile.contact-info.contact-info-card.contact-types.span.2" })} className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
            {addedCount}
          </span>
        ) : null}
      </div>

      <div {...uiAttributes({ uid: "profile.contact-info.contact-info-card.contact-types.div.3-LU86H9", id: "profile.contact-info.contact-info-card.contact-types.div.3" })} className="flex snap-x snap-mandatory gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <button
            key={item.id} {...uiAttributes({ uid: "profile.contact-info.contact-info-card.contact-types.button-r5883E", id: "profile.contact-info.contact-info-card.contact-types.button" , instance: createOpaqueUiInstanceId("iter-58cffe8d7a", String(item.id))})}
            type="button"
            aria-pressed={item.id === selectedId}
            onClick={() => onSelect(item.id)}
            aria-label={item.label}
            className={`group relative flex min-h-14 w-[4.25rem] shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-lg px-0 py-0.5 text-center shadow-sm transition-all active:scale-95 sm:w-[4.25rem] ${
              item.id === selectedId
                ? "border-2 border-primary bg-primary/20"
                : `border border-primary/40 bg-primary/5 ${item.count > 0 ? "border-primary/70" : ""}`
            }`}
          >
            {item.count > 0 ? (
              <span {...uiAttributes({ uid: "profile.contact-info.contact-info-card.contact-types.span.3-Rl0Pdc", id: "profile.contact-info.contact-info-card.contact-types.span.3" , instance: createOpaqueUiInstanceId("iter-6c0afc6100", String(item.id))})} className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-on-primary shadow-sm">
                {item.count}
              </span>
            ) : null}
            <FontAwesomeIcon
              icon={item.icon}
              className="h-11 w-11 transition-transform"
              style={{ color: getContactVisualColor(item.id) }}
            />
            <span {...uiAttributes({ uid: "profile.contact-info.contact-info-card.contact-types.span.4-6BnkTL", id: "profile.contact-info.contact-info-card.contact-types.span.4" , instance: createOpaqueUiInstanceId("iter-f207f5926b", String(item.id))})}
              className="line-clamp-2 w-[4.5rem] origin-top scale-[0.75] text-center text-[10px] font-semibold leading-[11px] tracking-tight text-muted-foreground"
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
