'use client';

import AppIcon from '@/shared/brand/AppIcon';
import { useTranslation } from '@/shared/i18n';

export function AuthMobileBrand({ id }: { id?: string }) {
  const { t } = useTranslation();

  return (
    <div id={id} className="lg:hidden flex items-center justify-center gap-3 mb-8">
      <AppIcon size="sm" />
      <span id="features-auth-presentation-authmobilebrand-text-2-pk1khi" className="text-lg font-semibold text-on-surface">{t('header.brand')}</span>
    </div>
  );
}
