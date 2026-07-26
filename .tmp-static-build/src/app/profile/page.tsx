'use client';

import { Suspense } from 'react';

import { ProfilePageContent } from '@/components/profile/ProfilePageContent';
import { useTranslation } from '@/lib/i18n';

function ProfilePageFallback() {
  const { t } = useTranslation();

  return (
    <div className="container px-4 py-8 text-sm text-on-surface-variant">
      {t('profile.loading')}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageFallback />}>
      <ProfilePageContent />
    </Suspense>
  );
}
