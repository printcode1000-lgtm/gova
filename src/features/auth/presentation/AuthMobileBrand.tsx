'use client';

import AppIcon from '@/shared/brand/AppIcon';
import { useTranslation } from '@/shared/i18n';

export function AuthMobileBrand() {
  const { t } = useTranslation();

  return (
    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
      <AppIcon size="sm" />
      <span className="text-lg font-semibold text-on-surface">{t('header.brand')}</span>
    </div>
  );
}
