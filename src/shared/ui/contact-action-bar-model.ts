import {
  faEnvelope,
  faFax,
  faGlobe,
  faLocationDot,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";

import {
  getContactVisualIcon,
} from "@/shared/ui/contact-visual-style";

import type {
  ContactActionBarData,
  ContactActionLocation,
  ContactActionPhone,
  ContactActionSocialLink,
  ContactGroup,
  ContactOption,
} from "./contact-action-bar.types";

export function buildContactGroups(
  data?: ContactActionBarData | null,
): ContactGroup[] {
  const phones = array(data?.phones).filter((item) => item.number?.trim());
  const emails = array(data?.emails).filter((item) => item.email?.trim());
  const websites = array(data?.websites).filter((item) => item.url?.trim());
  const socialLinks = array(data?.socialLinks).filter((item) =>
    item.url?.trim(),
  );
  const locations = array(data?.locations).filter(
    (item) => item.address?.trim() || hasCoordinates(item),
  );

  const phoneOptions = phones
    .filter((item) => !isPhoneType(item, ["whatsapp", "telegram", "viber", "fax"]))
    .map((item) => ({
      id: item.id,
      label: labelPhoneType(item.type),
      detail: item.number,
      href: `tel:${normalizeDialNumber(item.number)}`,
    }));

  const faxOptions = phones
    .filter((item) => isPhoneType(item, ["fax"]))
    .map((item) => ({
      id: item.id,
      label: "فاكس",
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
    href: getMapsHref(item),
  }));

  const groups: ContactGroup[] = [];
  pushGroup(groups, "phone", "اتصال", faPhone, phoneOptions);
  pushGroup(groups, "fax", "فاكس", faFax, faxOptions);
  pushGroup(groups, "whatsapp", "واتساب", getContactVisualIcon("whatsapp"), whatsappOptions);
  pushGroup(groups, "telegram", "Telegram", getContactVisualIcon("telegram"), telegramOptions);
  pushGroup(groups, "viber", "Viber", getContactVisualIcon("viber"), viberOptions);
  pushGroup(groups, "email", "البريد الإلكتروني", faEnvelope, emailOptions);
  pushGroup(groups, "website", "الموقع الإلكتروني", faGlobe, websiteOptions);
  pushGroup(groups, "location", "الموقع", faLocationDot, locationOptions);

  for (const [platform, options] of groupSocialLinks(socialLinks)) {
    pushGroup(
      groups,
      `social-${platform}`,
      labelSocialPlatform(platform),
      getContactVisualIcon(platform),
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
    const href = resolveSocialHref(link);
    if (!href) return;
    const options = grouped.get(platform) ?? [];
    options.push({
      id: link.id,
      label: labelSocialPlatform(platform),
      detail: link.url,
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
  icon: ContactGroup["icon"],
  options: ContactOption[],
) {
  if (options.length === 0) return;
  groups.push({ id, label, icon, options });
}

export function isDirectGroup(id: string): boolean {
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

function resolveSocialHref(link: ContactActionSocialLink): string {
  return link.url?.trim() ? normalizeUrl(link.url) : "";
}

function hasCoordinates(
  location: ContactActionLocation,
): location is ContactActionLocation & {
  latitude: number;
  longitude: number;
} {
  return (
    Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
  );
}

function getMapsHref(location: ContactActionLocation): string {
  if (hasCoordinates(location)) {
    return googleMapsSearchUrl(location.latitude, location.longitude);
  }
  return googleMapsSearchUrl(location.address);
}

export function isExternalHref(href: string): boolean {
  return (
    !href.startsWith("tel:") &&
    !href.startsWith("mailto:") &&
    !href.startsWith("viber:")
  );
}
import { googleMapsSearchUrl } from "@/features/location";
