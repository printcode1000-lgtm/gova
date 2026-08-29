'use client';

import { ChevronDown } from 'lucide-react';

import { EmailInput } from '@/features/auth/presentation/EmailInput';
import { StoreNameInput } from '@/features/auth/presentation/StoreNameInput';
import { useTranslation } from '@/shared/i18n';
import { uiAttributes } from "@asol/ui-registry-core";

export function OptionalRegistrationFields() {
  const { t } = useTranslation();

  return (
    <details {...uiAttributes({ uid: "auth.optional-registration-fields.details-jAED77", id: "auth.optional-registration-fields.details" })} className="group overflow-hidden rounded-xl border border-outline-variant bg-surface-container/30">
      <summary {...uiAttributes({ uid: "auth.optional-registration-fields.summary.2-P7BPFC", id: "auth.optional-registration-fields.summary.2" })} id="auth.optional-registration-fields.summary" className="flex min-h-12 list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-on-surface transition-colors active:bg-surface-container">
        <span {...uiAttributes({ uid: "auth.optional-registration-fields.span.2-M3J7DO", id: "auth.optional-registration-fields.span.2" })} id="auth.optional-registration-fields.span">{t('auth.email.optionalSection')}</span>
        <ChevronDown id="auth.optional-registration-fields.chevron-down"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-open:rotate-180"
        />
      </summary>
      <div {...uiAttributes({ uid: "auth.optional-registration-fields.div.2-CJQ0qG", id: "auth.optional-registration-fields.div.2" })} id="auth.optional-registration-fields.div" className="space-y-4 border-t border-outline-variant px-4 py-3">
        <EmailInput />
        <StoreNameInput />
      </div>
    </details>
  );
}
