"use client";

import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faEnvelope,
  faGlobe,
  faLocationDot,
  faPhone,
  faShareNodes,
} from "@fortawesome/free-solid-svg-icons";
import {
  faFacebook,
  faInstagram,
  faLinkedin,
  faPinterest,
  faTelegram,
  faTiktok,
  faViber,
  faWhatsapp,
  faXTwitter,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ContactActionPhone {
  id: string;
  number: string;
  type: string;
}

export interface ContactActionEmail {
  id: string;
  email: string;
  isPrimary?: boolean;
}

export interface ContactActionWebsite {
  id: string;
  url: string;
}

export interface ContactActionSocialLink {
  id: string;
  platform: string;
  url?: string;
  handle?: string;
}

export interface ContactActionLocation {
  id: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ContactActionBarData {
  phones?: ContactActionPhone[] | null;
  emails?: ContactActionEmail[] | null;
  websites?: ContactActionWebsite[] | null;
  socialLinks?: ContactActionSocialLink[] | null;
  locations?: ContactActionLocation[] | null;
}

interface ContactActionBarProps {
  data?: ContactActionBarData | null;
  className?: string;
  label?: string;
  compact?: boolean;
}

interface ContactOption {
  id: string;
  label: string;
  detail?: string;
  href: string;
}

interface ContactGroup {
  id: string;
  label: string;
  icon: IconDefinition;
  options: ContactOption[];
}

const SOCIAL_ICONS: Record<string, IconDefinition> = {
  facebook: faFacebook,
  instagram: faInstagram,
  twitter: faXTwitter,
  x: faXTwitter,
  tiktok: faTiktok,
  youtube: faYoutube,
  pinterest: faPinterest,
  linkedin: faLinkedin,
  telegram: faTelegram,
  viber: faViber,
  whatsapp: faWhatsapp,
};

const SOCIAL_BASE_URLS: Record<string, string> = {
  facebook: "https://facebook.com/",
  instagram: "https://instagram.com/",
  twitter: "https://x.com/",
  x: "https://x.com/",
  tiktok: "https://www.tiktok.com/@",
  youtube: "https://youtube.com/",
  pinterest: "https://pinterest.com/",
  linkedin: "https://linkedin.com/in/",
  telegram: "https://t.me/",
};

export function ContactActionBar({
  data,
  className,
  label = "وسائل التواصل",
  compact = false,
}: ContactActionBarProps) {
  const groups = React.useMemo(() => buildContactGroups(data), [data]);
  if (groups.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-outline-variant bg-surface/90 px-3 py-3 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {!compact ? (
          <span className="shrink-0 text-xs font-semibold text-on-surface-variant">
            {label}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((group) => (
            <ContactActionGroup key={group.id} group={group} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactActionGroup({ group }: { group: ContactGroup }) {
  if (group.options.length === 1 && isDirectGroup(group.id)) {
    const option = group.options[0]!;
    return (
      <Button
        asChild
        type="button"
        size="icon"
        variant="outline"
        className="h-10 w-10 shrink-0 rounded-full"
        title={group.label}
        aria-label={group.label}
      >
        <a
          href={option.href}
          target={isExternalHref(option.href) ? "_blank" : undefined}
          rel={isExternalHref(option.href) ? "noreferrer" : undefined}
        >
          <FontAwesomeIcon icon={group.icon} className="h-4 w-4" />
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10 shrink-0 rounded-full"
          title={group.label}
          aria-label={group.label}
        >
          <FontAwesomeIcon icon={group.icon} className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-64">
        <div dir="rtl">
          <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
          {group.options.map((option) => (
            <DropdownMenuItem key={option.id} asChild>
              <a
                href={option.href}
                target={isExternalHref(option.href) ? "_blank" : undefined}
                rel={isExternalHref(option.href) ? "noreferrer" : undefined}
                className="flex min-w-0 flex-col items-start"
              >
                <span className="max-w-56 truncate font-medium">
                  {option.label}
                </span>
                {option.detail ? (
                  <span className="max-w-56 truncate text-xs text-muted-foreground">
                    {option.detail}
                  </span>
                ) : null}
              </a>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildContactGroups(data?: ContactActionBarData | null): ContactGroup[] {
  const phones = array(data?.phones).filter((item) => item.number?.trim());
  const emails = array(data?.emails).filter((item) => item.email?.trim());
  const websites = array(data?.websites).filter((item) => item.url?.trim());
  const socialLinks = array(data?.socialLinks).filter(
    (item) => item.url?.trim() || item.handle?.trim(),
  );
  const locations = array(data?.locations).filter(
    (item) => item.address?.trim() || hasCoordinates(item),
  );

  const phoneOptions = phones
    .filter((item) => !isPhoneType(item, ["whatsapp", "telegram", "viber"]))
    .map((item) => ({
      id: item.id,
      label: labelPhoneType(item.type),
      detail: item.number,
      href: `tel:${normalizeDialNumber(item.number)}`,
    }));

  const whatsappOptions = phones
    .filter((item) => isPhoneType(item, ["whatsapp"]))
    .map((item) => ({
      id: item.id,
      label: "واتساب",
      detail: item.number,
      href: `https://wa.me/${normalizeDialNumber(item.number)}`,
    }));

  const telegramOptions = phones
    .filter((item) => isPhoneType(item, ["telegram"]))
    .map((item) => ({
      id: item.id,
      label: "Telegram",
      detail: item.number,
      href: `https://t.me/${normalizeDialNumber(item.number)}`,
    }));

  const viberOptions = phones
    .filter((item) => isPhoneType(item, ["viber"]))
    .map((item) => ({
      id: item.id,
      label: "Viber",
      detail: item.number,
      href: `viber://chat?number=${normalizeDialNumber(item.number)}`,
    }));

  const emailOptions = emails.map((item) => ({
    id: item.id,
    label: item.isPrimary ? "البريد الأساسي" : "البريد الإلكتروني",
    detail: item.email,
    href: `mailto:${item.email.trim()}`,
  }));

  const websiteOptions = websites.map((item, index) => ({
    id: item.id,
    label: index === 0 ? "الموقع الإلكتروني" : `موقع ${index + 1}`,
    detail: item.url,
    href: normalizeUrl(item.url),
  }));

  const locationOptions = locations.map((item, index) => ({
    id: item.id,
    label: item.address?.trim() || `الموقع ${index + 1}`,
    detail: hasCoordinates(item)
      ? `${item.latitude}, ${item.longitude}`
      : undefined,
    href: getMapsHref(item),
  }));

  const groups: ContactGroup[] = [];
  pushGroup(groups, "phone", "اتصال", faPhone, phoneOptions);
  pushGroup(groups, "whatsapp", "واتساب", faWhatsapp, whatsappOptions);
  pushGroup(groups, "telegram", "Telegram", faTelegram, telegramOptions);
  pushGroup(groups, "viber", "Viber", faViber, viberOptions);
  pushGroup(groups, "email", "البريد الإلكتروني", faEnvelope, emailOptions);
  pushGroup(groups, "website", "الموقع الإلكتروني", faGlobe, websiteOptions);
  pushGroup(groups, "location", "الموقع", faLocationDot, locationOptions);

  for (const [platform, options] of groupSocialLinks(socialLinks)) {
    pushGroup(
      groups,
      `social-${platform}`,
      labelSocialPlatform(platform),
      SOCIAL_ICONS[platform] ?? faShareNodes,
      options,
    );
  }

  return groups;
}

function groupSocialLinks(
  links: ContactActionSocialLink[],
): Array<[string, ContactOption[]]> {
  const grouped = new Map<string, ContactOption[]>();
  links.forEach((link) => {
    const platform = normalizePlatform(link.platform);
    const href = resolveSocialHref(platform, link);
    if (!href) return;
    const options = grouped.get(platform) ?? [];
    options.push({
      id: link.id,
      label: labelSocialPlatform(platform),
      detail: link.handle || link.url,
      href,
    });
    grouped.set(platform, options);
  });
  return [...grouped.entries()];
}

function pushGroup(
  groups: ContactGroup[],
  id: string,
  label: string,
  icon: IconDefinition,
  options: ContactOption[],
) {
  if (options.length === 0) return;
  groups.push({ id, label, icon, options });
}

function isDirectGroup(id: string): boolean {
  return id === "website" || id.startsWith("social-");
}

function array<T>(value?: T[] | null): T[] {
  return Array.isArray(value) ? value : [];
}

function isPhoneType(item: ContactActionPhone, types: string[]): boolean {
  return types.includes(item.type.trim().toLowerCase());
}

function labelPhoneType(type: string): string {
  const normalized = type.trim().toLowerCase();
  if (normalized === "fax") return "فاكس";
  if (normalized === "mobile") return "موبايل";
  return "هاتف";
}

function normalizeDialNumber(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizePlatform(platform: string): string {
  const normalized = platform.trim().toLowerCase();
  if (normalized === "x-twitter") return "x";
  return normalized;
}

function labelSocialPlatform(platform: string): string {
  const labels: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    twitter: "X",
    x: "X",
    tiktok: "TikTok",
    youtube: "YouTube",
    pinterest: "Pinterest",
    linkedin: "LinkedIn",
    telegram: "Telegram",
    viber: "Viber",
    whatsapp: "WhatsApp",
  };
  return labels[platform] ?? platform;
}

function resolveSocialHref(
  platform: string,
  link: ContactActionSocialLink,
): string {
  if (link.url?.trim()) return normalizeUrl(link.url);
  const handle = link.handle?.trim().replace(/^@/, "");
  if (!handle) return "";
  const base = SOCIAL_BASE_URLS[platform];
  return base ? `${base}${encodeURIComponent(handle)}` : "";
}

function hasCoordinates(location: ContactActionLocation): boolean {
  return (
    Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
  );
}

function getMapsHref(location: ContactActionLocation): string {
  if (hasCoordinates(location)) {
    return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location.address.trim(),
  )}`;
}

function isExternalHref(href: string): boolean {
  return (
    !href.startsWith("tel:") &&
    !href.startsWith("mailto:") &&
    !href.startsWith("viber:")
  );
}
