'use client';

import ComingSoonScreen from '@/components/layouts/ComingSoonScreen';
import { useTranslation } from '@/lib/i18n';

export default function NotificationsPage() {
  const { t } = useTranslation();
  return <ComingSoonScreen title={t('nav.notifications')} tone="error" />;
}
