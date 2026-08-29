'use client';

import AppIcon from '@/shared/brand/AppIcon';
import { useTranslation } from '@/shared/i18n';
import { uiAttributes } from "@asol/ui-registry-core";

export function AuthMobileBrand({ id }: { id?: string }) {
  const { t } = useTranslation();

  return (
    <div {...uiAttributes({ uid: "auth.auth-mobile-brand.div-396TBv", id: "auth.auth-mobile-brand.div" })} id={id} className="lg:hidden flex items-center justify-center gap-3 mb-8">
      <AppIcon size="sm" />
      <span {...uiAttributes({ uid: "auth.auth-mobile-brand.span-3Bx7Mr", id: "auth.auth-mobile-brand.span" })} className="text-lg font-semibold text-on-surface">{t('header.brand')}</span>
    </div>
  );
}
