'use client';

import ComingSoonScreen from '@/components/layouts/ComingSoonScreen';
import { useTranslation } from '@/lib/i18n';

export default function ProfilePage() {
  const { t } = useTranslation();
  return <ComingSoonScreen title={t('nav.profile')} tone="primary" />;
}
