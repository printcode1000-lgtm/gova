'use client';

import { Suspense } from 'react';

import { RegistrationPageContent } from '@/components/auth/RegistrationPageContent';
import { useTranslation } from '@/lib/i18n';

function RegistrationFallback() {
  const { t } = useTranslation();

  return (
    <div className="auth-page flex items-center justify-center">
      <div className="text-base text-on-surface-variant">{t('auth.registration.loading')}</div>
    </div>
  );
}

export default function RegistrationPage() {
  return (
    <Suspense fallback={<RegistrationFallback />}>
      <RegistrationPageContent />
    </Suspense>
  );
}
