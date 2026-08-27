import type * as React from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

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

export interface CustomActionButton {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  color?: string;
}

export interface ContactActionBarProps {
  data?: ContactActionBarData | null;
  className?: string;
  label?: string;
  compact?: boolean;
  customActions?: CustomActionButton[];
  id?: string;
}

export interface ContactOption {
  id: string;
  label: string;
  detail?: string;
  href: string;
}

export interface ContactGroup {
  id: string;
  label: string;
  icon: IconDefinition;
  options: ContactOption[];
}
