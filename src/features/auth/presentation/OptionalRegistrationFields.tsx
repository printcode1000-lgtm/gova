'use client';

import { ChevronDown } from 'lucide-react';

import { EmailInput } from '@/features/auth/presentation/EmailInput';
import { StoreNameInput } from '@/features/auth/presentation/StoreNameInput';
import { useTranslation } from '@/shared/i18n';

export function OptionalRegistrationFields() {
  const { t } = useTranslation();

  return (
    <details className="group overflow-hidden rounded-xl border border-outline-variant bg-surface-container/30">
      <summary id="auth.optional-registration-fields.summary" className="flex min-h-12 list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-on-surface transition-colors active:bg-surface-container">
        <span id="auth.optional-registration-fields.span">{t('auth.email.optionalSection')}</span>
        <ChevronDown id="auth.optional-registration-fields.chevron-down"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-open:rotate-180"
        />
      </summary>
      <div id="auth.optional-registration-fields.div" className="space-y-4 border-t border-outline-variant px-4 py-3">
        <EmailInput />
        <StoreNameInput />
      </div>
    </details>
  );
}
