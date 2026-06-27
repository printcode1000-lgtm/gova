'use client';

import { Loader2, Save } from 'lucide-react';

import { ContactInfoCard } from '@/components/profile/ContactInfoCard';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useProfileContacts } from '@/features/profile/hooks/use-profile-contacts';

export function ProfileContactsCard() {
  const { t } = useTranslation();
  const {
    contacts,
    updateContacts,
    isDirty,
    isLoading,
    isSaving,
    error,
    save,
    saved,
  } = useProfileContacts();

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
        <div className="rounded-lg bg-error/15 px-3 py-2 text-sm text-error">{error}</div>
      ) : null}
      {saved && !isDirty ? (
        <div className="rounded-lg bg-success/15 px-3 py-2 text-sm text-success">
          {t('profile.saved')}
        </div>
      ) : null}

      <ContactInfoCard data={contacts} onChange={updateContacts} hidePrimarySection />

      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={!isDirty || isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('profile.save')}
        </Button>
      </div>
    </div>
  );
}
