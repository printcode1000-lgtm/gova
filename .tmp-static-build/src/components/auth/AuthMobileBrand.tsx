'use client';

import AppIcon from '@/components/brand/AppIcon';
import { useTranslation } from '@/lib/i18n';

export function AuthMobileBrand() {
  const { t } = useTranslation();

  return (
    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
      <AppIcon size="sm" />
      <span className="text-lg font-semibold text-on-surface">{t('header.brand')}</span>
    </div>
  );
}
