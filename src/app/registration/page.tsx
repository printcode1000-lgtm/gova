'use client';

import { Suspense } from 'react';

import { RegistrationPageContent } from '@/features/auth/ui';
import { useTranslation } from '@/shared/i18n';
import { uiAttributes } from "@asol/ui-registry-core";

function RegistrationFallback() {
  const { t } = useTranslation();

  return (
    <div {...uiAttributes({ uid: "registration.page.div.3-F5CSIS", id: "registration.page.div.3" })} id="registration.page.div" className="auth-page flex items-center justify-center">
      <div {...uiAttributes({ uid: "registration.page.div.4-yX4gOC", id: "registration.page.div.4" })} id="registration.page.div.2" className="text-base text-on-surface-variant">{t('auth.registration.loading')}</div>
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
