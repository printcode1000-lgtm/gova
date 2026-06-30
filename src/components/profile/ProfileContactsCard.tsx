'use client';

import { Loader2, Save } from 'lucide-react';

import { ContactInfoCard } from '@/components/profile/ContactInfoCard';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useProfileContacts } from '@/features/profile/hooks/use-profile-contacts';
import * as React from 'react';
import type {
  ProfileContactsController,
  ProfileSectionStatus,
} from './profile-save-controller';

interface ProfileContactsCardProps {
  showSaveButton?: boolean;
  onStatusChange?: (status: ProfileSectionStatus) => void;
}

export const ProfileContactsCard = React.forwardRef<
  ProfileContactsController,
  ProfileContactsCardProps
>(function ProfileContactsCard({ showSaveButton = true, onStatusChange }, ref) {
  const { t } = useTranslation();
  const {
    contacts,
    updateContacts,
    isDirty,
    isLoading,
    isSaving,
    error,
    save,
    saveAsync,
    applySaved,
    saved,
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
      <div className="py-10 text-center text-sm text-on-surface-variant">
        {t('profile.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error}
        </div>
      ) : null}
      {saved && !isDirty ? (
        <div className="rounded-lg bg-success/15 px-3 py-2 text-sm text-success">
          {t('profile.saved')}
        </div>
      ) : null}

      <ContactInfoCard
        data={contacts}
        onChange={updateContacts}
        hidePrimarySection
      />

      {showSaveButton && isDirty ? (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={save}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('profile.save')}
          </Button>
        </div>
      ) : null}
    </div>
  );
});
