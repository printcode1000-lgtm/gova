'use client';

import ComingSoonScreen from '@/components/layouts/ComingSoonScreen';
import { useTranslation } from '@/lib/i18n';

export default function FavoritesPage() {
  const { t } = useTranslation();
  return <ComingSoonScreen title={t('nav.favorites')} tone="tertiary" />;
}
