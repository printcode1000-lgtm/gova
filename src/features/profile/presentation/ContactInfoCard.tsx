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
import { getContactVisualColor, getContactVisualIcon } from "./contact-visual-style";
import { shareLocationUrl } from "@/features/sharing/ui";
import { SOCIAL_PLATFORMS, PHONE_TYPES, SocialLink, PhoneLink, ContactInfoData, ContactInfoCardProps, tileProvider, gpsProvider, normalizeContactInfoData, quickAddColor, quickAddIcon, ContactQuickAddGrid } from "./contact-info/ContactInfoCard.contact-types";

import { useContactInfoCardModel } from "./contact-info/ContactInfoCard.model";

import { ContactInfoCardView } from "./contact-info/ContactInfoCard.view";

export function ContactInfoCard({
  data,
  onChange,
  readOnly = false,
  hidePrimarySection = false,
}: ContactInfoCardProps){
  const model = useContactInfoCardModel({ data, onChange, readOnly, hidePrimarySection });
  return <ContactInfoCardView model={model} />;
}

export default ContactInfoCard;
