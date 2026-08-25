import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faEnvelope,
  faFax,
  faGlobe,
  faLocationDot,
  faPhone,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import {
  faFacebookF,
  faInstagram,
  faPinterestP,
  faTelegram,
  faTiktok,
  faViber,
  faWhatsapp,
  faXTwitter,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";

export const CONTACT_VISUAL_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  phone: "#0284C7",
  fax: "#F97316",
  telegram: "#229ED9",
  viber: "#7360F2",
  email: "#D97706",
  website: "#4F46E5",
  location: "#E11D48",
  facebook: "#1877F2",
  instagram: "#C13584",
  pinterest: "#BD081C",
  tiktok: "#00B8A9",
  twitter: "#111827",
  x: "#111827",
  youtube: "#FF0000",
};

export const CONTACT_VISUAL_ICONS: Record<string, IconDefinition> = {
  whatsapp: faWhatsapp,
  phone: faPhone,
  fax: faFax,
  telegram: faTelegram,
  viber: faViber,
  email: faEnvelope,
  website: faGlobe,
  location: faLocationDot,
  facebook: faFacebookF,
  instagram: faInstagram,
  pinterest: faPinterestP,
  tiktok: faTiktok,
  twitter: faXTwitter,
  x: faXTwitter,
  youtube: faYoutube,
};

export function normalizeContactVisualId(id: string): string {
  const normalized = id.trim().toLowerCase();
  if (normalized.startsWith("social-")) {
    return normalizeContactVisualId(normalized.slice("social-".length));
  }
  if (normalized === "x-twitter") return "x";
  return normalized;
}

export function getContactVisualColor(id: string): string {
  return CONTACT_VISUAL_COLORS[normalizeContactVisualId(id)] ?? "#6750A4";
}

export function getContactVisualIcon(id: string): IconDefinition {
  return CONTACT_VISUAL_ICONS[normalizeContactVisualId(id)] ?? faPlus;
}
