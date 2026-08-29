'use client';

import { ContactInfoCard } from '@/features/profile/presentation/ContactInfoCard';
import { useTranslation } from '@/shared/i18n';
import { useProfileContacts } from '@/features/profile/presentation/hooks/use-profile-contacts';
import * as React from 'react';
import type {
  ProfileContactsController,
  ProfileSectionStatus,
} from './profile-save-controller';
import { uiAttributes } from "@asol/ui-registry-core";

interface ProfileContactsCardProps {
  onStatusChange?: (status: ProfileSectionStatus) => void;
}

export const ProfileContactsCard = React.forwardRef<
  ProfileContactsController,
  ProfileContactsCardProps
>(function ProfileContactsCard({ onStatusChange }, ref) {
  const { t } = useTranslation();
  const {
    contacts,
    updateContacts,
    isDirty,
    isLoading,
    isSaving,
    error,
    saveAsync,
    applySaved,
  } = useProfileContacts();
  const label = t('onboarding.contactInfo.additionalContact');

  React.useImperativeHandle(
    ref,
    () => ({
      isDirty,
      isSaving,
      canSave: true,
      label,
      save: saveAsync,
      getSnapshot: () => contacts,
      applySaved,
    }),
    [applySaved, contacts, isDirty, isSaving, label, saveAsync],
  );

  React.useEffect(() => {
    onStatusChange?.({ isDirty, isSaving, canSave: true, label });
  }, [isDirty, isSaving, label, onStatusChange]);

  if (isLoading) {
    return (
      <div {...uiAttributes({ uid: "profile.profile-contacts-card.div.4-U2abt9", id: "profile.profile-contacts-card.div.4" })} id="profile.profile-contacts-card.div" className="py-10 text-center text-sm text-on-surface-variant">
        {t('profile.loading')}
      </div>
    );
  }

  return (
    <div {...uiAttributes({ uid: "profile.profile-contacts-card.div.5-v1MNAz", id: "profile.profile-contacts-card.div.5" })} id="profile.profile-contacts-card.div.2" className="space-y-4">
      {error ? (
        <div {...uiAttributes({ uid: "profile.profile-contacts-card.div.6-H7KNtJ", id: "profile.profile-contacts-card.div.6" })} id="profile.profile-contacts-card.div.3" className="rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error}
        </div>
      ) : null}
      <ContactInfoCard
        data={contacts}
        onChange={updateContacts}
        hidePrimarySection
      />
    </div>
  );
});
