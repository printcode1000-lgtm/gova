'use client';

import ComingSoonScreen from '@/components/layouts/ComingSoonScreen';
import { useTranslation } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  return <ComingSoonScreen title={t('auth.forgotPassword.title')} tone="secondary" />;
}
