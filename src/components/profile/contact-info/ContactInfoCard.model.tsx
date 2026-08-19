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

export function useContactInfoCardModel({
  data,
  onChange,
  readOnly = false,
  hidePrimarySection = false,
}: ContactInfoCardProps){
const { t, locale } = useTranslation();

const shouldWrapInCard = !hidePrimarySection;

const [localData, setLocalData] = React.useState<ContactInfoData>(() => {
    if (data) {
      return normalizeContactInfoData(data);
    }
    if (hidePrimarySection) {
      return {
        phones: [],
        emails: [],
        websites: [],
        socialLinks: [],
        locations: [],
      };
    }
    return {
      phones: [{ id: 'primary-whatsapp', number: '', type: 'whatsapp' }],
      emails: [{ id: 'primary', email: '', isPrimary: true }],
      websites: [],
      socialLinks: [],
      locations: [],
    };
  });

React.useEffect(() => {
    if (!data) return;
    setLocalData(normalizeContactInfoData(data));
  }, [data]);

const [isPasswordOpen, setIsPasswordOpen] = React.useState(false);

const [passwordData, setPasswordData] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

const [openMapId, setOpenMapId] = React.useState<string | null>(null);

const [mapMessages, setMapMessages] = React.useState<Record<string, string>>({});

const updateField = (field: keyof ContactInfoData, value: string) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onChange?.(newData);
  };

const addPhone = (type: string) => {
    const newData = {
      ...localData,
      phones: [...localData.phones, { id: Date.now().toString(), number: '', type }],
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const updatePhone = (id: string, updates: { number?: string }) => {
    const newData = {
      ...localData,
      phones: localData.phones.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const removePhone = (id: string) => {
    const newData = {
      ...localData,
      phones: localData.phones.filter((p) => p.id !== id),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const addAnotherPhone = (type: string) => {
    addPhone(type);
  };

const phonesForAdditional = React.useMemo(
    () =>
      hidePrimarySection
        ? localData.phones.filter((p) => p.id !== 'primary-whatsapp')
        : localData.phones,
    [hidePrimarySection, localData.phones],
  );

const groupedPhones = React.useMemo(() => {
    const grouped: Record<string, PhoneLink[]> = {};
    phonesForAdditional.forEach((phone) => {
      if (!grouped[phone.type]) {
        grouped[phone.type] = [];
      }
      grouped[phone.type].push(phone);
    });
    return grouped;
  }, [phonesForAdditional]);

const addedPhoneTypes = phonesForAdditional.map((p) => p.type);

const availablePhoneTypes = PHONE_TYPES.filter((p) => !addedPhoneTypes.includes(p));

const hasAdditionalEmails = localData.emails.some((e) => e.id !== 'primary');

const hasWebsites = localData.websites.length > 0;

const handleAddItem = (value: string) => {
    if (value === 'email') {
      addEmail();
    } else if (value === 'website') {
      addWebsite();
    } else if (value === 'location') {
      addLocation();
    } else if (PHONE_TYPES.includes(value as any)) {
      addPhone(value);
    } else if (SOCIAL_PLATFORMS.includes(value as any)) {
      addSocialLink(value);
    }
  };

const addWebsite = () => {
    const newData = {
      ...localData,
      websites: [...localData.websites, { id: Date.now().toString(), url: '' }],
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const updateWebsite = (id: string, updates: { url?: string }) => {
    const newData = {
      ...localData,
      websites: localData.websites.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const removeWebsite = (id: string) => {
    const newData = {
      ...localData,
      websites: localData.websites.filter((s) => s.id !== id),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const addEmail = () => {
    const newData = {
      ...localData,
      emails: [...localData.emails, { id: Date.now().toString(), email: '', isPrimary: false }],
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const updateEmail = (id: string, updates: { email?: string }) => {
    const newData = {
      ...localData,
      emails: localData.emails.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const removeEmail = (id: string) => {
    const newData = {
      ...localData,
      emails: localData.emails.filter((e) => e.id !== id),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const addSocialLink = (platform: string) => {
    const newData = {
      ...localData,
      socialLinks: [...localData.socialLinks, { id: Date.now().toString(), platform, url: '' }],
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const updateSocialLink = (id: string, updates: { url?: string }) => {
    const newData = {
      ...localData,
      socialLinks: localData.socialLinks.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const removeSocialLink = (id: string) => {
    const newData = {
      ...localData,
      socialLinks: localData.socialLinks.filter((s) => s.id !== id),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const addAnotherLink = (platform: string) => {
    addSocialLink(platform);
  };

const addLocation = () => {
    const id = `loc-${Date.now()}`;
    const newEntry: LocationEntry = { id, address: '', latitude: 0, longitude: 0 };
    const newData = { ...localData, locations: [...localData.locations, newEntry] };
    setLocalData(newData);
    onChange?.(newData);
    setOpenMapId(id);
  };

const updateLocationEntry = (id: string, updates: Partial<Omit<LocationEntry, 'id'>>) => {
    const newData = {
      ...localData,
      locations: localData.locations.map((loc) =>
        loc.id === id ? { ...loc, ...updates } : loc,
      ),
    };
    setLocalData(newData);
    onChange?.(newData);
  };

const removeLocation = (id: string) => {
    const newData = {
      ...localData,
      locations: localData.locations.filter((loc) => loc.id !== id),
    };
    setLocalData(newData);
    onChange?.(newData);
    if (openMapId === id) setOpenMapId(null);
  };

const setMapMessage = (id: string, msg: string) => {
    setMapMessages((prev) => ({ ...prev, [id]: msg }));
  };

const addedPlatforms = localData.socialLinks.map((s) => s.platform);

const availablePlatforms = SOCIAL_PLATFORMS.filter((p) => !addedPlatforms.includes(p));

const quickAddItems = React.useMemo(
    () => [
      {
        id: 'location',
        label: locale === 'ar' ? 'تحديد الموقع الجغرافي' : 'Pick geolocation',
        icon: faLocationDot,
        available: true,
      },
      ...availablePhoneTypes.map((type) => ({
        id: type,
        label: t(`onboarding.contactInfo.phoneTypes.${type}`),
        icon: getContactVisualIcon(type),
        available: true,
      })),
      {
        id: 'email',
        label: t('onboarding.contactInfo.addEmail'),
        icon: faEnvelope,
        available: !hasAdditionalEmails,
      },
      ...availablePlatforms.map((platform) => ({
        id: platform,
        label: t(`onboarding.contactInfo.platforms.${platform}`),
        icon: getContactVisualIcon(platform),
        available: true,
      })),
      {
        id: 'website',
        label: t('onboarding.contactInfo.addWebsite'),
        icon: faGlobe,
        available: !hasWebsites,
      },
    ],
    [
      availablePhoneTypes,
      availablePlatforms,
      hasAdditionalEmails,
      hasWebsites,
      locale,
      t,
    ],
  );

const groupedSocialLinks = React.useMemo(() => {
    const grouped: Record<string, SocialLink[]> = {};
    localData.socialLinks.forEach((link) => {
      if (!grouped[link.platform]) {
        grouped[link.platform] = [];
      }
      grouped[link.platform].push(link);
    });
    return grouped;
  }, [localData.socialLinks]);

return { data, onChange, readOnly, hidePrimarySection, t, locale, shouldWrapInCard, localData, setLocalData, isPasswordOpen, setIsPasswordOpen, passwordData, setPasswordData, openMapId, setOpenMapId, mapMessages, setMapMessages, updateField, addPhone, updatePhone, removePhone, addAnotherPhone, phonesForAdditional, groupedPhones, addedPhoneTypes, availablePhoneTypes, hasAdditionalEmails, hasWebsites, handleAddItem, addWebsite, updateWebsite, removeWebsite, addEmail, updateEmail, removeEmail, addSocialLink, updateSocialLink, removeSocialLink, addAnotherLink, addLocation, updateLocationEntry, removeLocation, setMapMessage, addedPlatforms, availablePlatforms, quickAddItems, groupedSocialLinks };
}


export type ContactInfoCardModel = ReturnType<typeof useContactInfoCardModel>;
