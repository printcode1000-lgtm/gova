'use client';

import { ChevronDown } from 'lucide-react';

import { EmailInput } from '@/features/auth/presentation/EmailInput';
import { StoreNameInput } from '@/features/auth/presentation/StoreNameInput';
import { useTranslation } from '@/shared/i18n';

export function OptionalRegistrationFields() {
  const { t } = useTranslation();

  return (
    <details id="features-auth-presentation-optionalregistrationfields-details-1-hq2xi5" className="group overflow-hidden rounded-xl border border-outline-variant bg-surface-container/30">
      <summary id='features-auth-presentation-optionalregistrationfields-summary-2-jsa16n' className="flex min-h-12 list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-on-surface transition-colors active:bg-surface-container">
        <span id='features-auth-presentation-optionalregistrationfields-text-3-ywylgg'>{t('auth.email.optionalSection')}</span>
        <ChevronDown id='features-auth-presentation-optionalregistrationfields-chevrondown-4-0q4p0o'
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-open:rotate-180"
        />
      </summary>
      <div id='features-auth-presentation-optionalregistrationfields-div-5-wpekeh' className="space-y-4 border-t border-outline-variant px-4 py-3">
        <EmailInput />
        <StoreNameInput />
      </div>
    </details>
  );
}
