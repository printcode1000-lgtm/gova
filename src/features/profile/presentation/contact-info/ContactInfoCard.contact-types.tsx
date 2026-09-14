'use client';

import * as React from 'react';
import { Plus, X, Phone, MessageCircle, Mail, Globe, Share2, ChevronDown, Lock, Smartphone, MapPin } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  SPATIAL_CAROUSEL_FLOOR_GLOW_CLASSNAME,
  SPATIAL_CAROUSEL_ICON_WRAP_CLASSNAME,
  SPATIAL_CAROUSEL_ITEM_CLASSNAME,
  SPATIAL_CAROUSEL_LABEL_CLASSNAME,
  SPATIAL_CAROUSEL_POPOVER_ARROW_CLASSNAME,
  SPATIAL_CAROUSEL_POPOVER_CLASSNAME,
  SPATIAL_CAROUSEL_SHELL_CLASSNAME,
  SPATIAL_CAROUSEL_VIEWPORT_CLASSNAME,
  SPATIAL_CAROUSEL_VIEWPORT_STYLE,
  getSpatialCarouselIconStyle,
  getSpatialCarouselIconWrapStyle,
  getSpatialCarouselItemPresentation,
  getSpatialCarouselLabelStyle,
  getSpatialCarouselPopoverArrowStyle,
  getSpatialCarouselPopoverStyle,
  shouldShowSpatialCarouselLabel,
  useSpatialCarousel,
} from '@asol/spatial-carousel-core';
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

export function ContactKindPopover({
  id,
  activeKindId,
  children,
}: {
  id?: string;
  activeKindId: string | null;
  children: React.ReactNode;
}) {
  if (!activeKindId) return null;
  const color = quickAddColor(activeKindId);

  return (
    <div
      id={id}
      className={SPATIAL_CAROUSEL_POPOVER_CLASSNAME}
      style={getSpatialCarouselPopoverStyle(color)}
    >
      <span
        id={id ? `${id}-arrow-2-q7m4vk` : undefined}
        aria-hidden="true"
        className={SPATIAL_CAROUSEL_POPOVER_ARROW_CLASSNAME}
        style={getSpatialCarouselPopoverArrowStyle(color)}
      />
      <div
        id={id ? `${id}-content-3-r8n5wp` : undefined}
        className="relative z-10 space-y-[6px]"
      >
        {children}
      </div>
    </div>
  );
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
  const selectedIndex = Math.max(0, items.findIndex((item) => item.id === selectedId));
  const {
    centerIndex,
    setCenterIndex,
    moveCenter,
    draggedRef,
    pointerHandlers,
  } = useSpatialCarousel({
    itemCount: items.length,
    selectedIndex,
    onSettledIndex: (index) => {
      const centeredItem = items[index];
      if (centeredItem && centeredItem.id !== selectedId) onSelect(centeredItem.id);
    },
  });

  return (
    <div
      id={id}
      role="group"
      aria-label={title}
      className={SPATIAL_CAROUSEL_SHELL_CLASSNAME}
    >
      <div
        id="profile-presentation-contact-info-contactinfocard-contact-types-div-6-9bqz7t"
        tabIndex={0}
        {...pointerHandlers}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            moveCenter(-1);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            moveCenter(1);
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const centeredItem = items[centerIndex];
            if (centeredItem) onSelect(centeredItem.id);
          }
        }}
        className={SPATIAL_CAROUSEL_VIEWPORT_CLASSNAME}
        style={SPATIAL_CAROUSEL_VIEWPORT_STYLE}
      >
        <div
          id="profile-presentation-contact-info-contactinfocard-contact-types-floor-glow-7w2q9m"
          aria-hidden="true"
          className={SPATIAL_CAROUSEL_FLOOR_GLOW_CLASSNAME}
        />
        {items.map((item, index) => {
          const color = getContactVisualColor(item.id);
          const presentation = getSpatialCarouselItemPresentation(
            index,
            centerIndex,
            items.length,
            color,
          );
          const { centered } = presentation;

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === selectedId}
              onClick={(event) => {
                if (draggedRef.current) {
                  event.preventDefault();
                  return;
                }
                if (!centered) {
                  setCenterIndex(index);
                  return;
                }
                onSelect(item.id);
              }}
              aria-label={item.label}
              className={SPATIAL_CAROUSEL_ITEM_CLASSNAME}
              style={presentation.style}
            >
              {item.count > 0 ? (
                <span className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-on-primary shadow-sm">
                  {item.count}
                </span>
              ) : null}
              <span className={SPATIAL_CAROUSEL_ICON_WRAP_CLASSNAME} style={getSpatialCarouselIconWrapStyle(centered)}>
                {centered ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full blur-md"
                    style={{ backgroundColor: `${color}2A` }}
                  />
                ) : null}
                <FontAwesomeIcon
                  icon={item.icon}
                  className="relative z-10 shrink-0 transition-transform duration-300"
                  style={getSpatialCarouselIconStyle(color, centered)}
                />
              </span>
              {shouldShowSpatialCarouselLabel(centered) ? (
                <span
                  className={SPATIAL_CAROUSEL_LABEL_CLASSNAME}
                  style={getSpatialCarouselLabelStyle(color, centered)}
                >
                  {item.label}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
