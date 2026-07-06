'use client';

import ComingSoonScreen from '@/components/layouts/ComingSoonScreen';
import { useTranslation } from '@/lib/i18n';

export default function OrdersPage() {
  const { t } = useTranslation();
  return <ComingSoonScreen title={t('nav.orders')} tone="secondary" />;
}
