'use client';

import { LogOut } from 'lucide-react';

import { useMobileBackButton } from '@/features/navigation/hooks/use-mobile-back-button';
import { useTranslation } from '@/lib/i18n';

export function MobileBackButtonController() {
  const { showExitHint } = useMobileBackButton();
  const { t } = useTranslation();

  if (!showExitHint) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-20 z-[140] mx-auto flex max-w-sm items-center justify-center gap-2 rounded-2xl bg-inverse-surface px-4 py-3 text-sm font-semibold text-inverse-on-surface shadow-xl md:bottom-5"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {t('navigation.pressBackAgainToExit')}
    </div>
  );
}
