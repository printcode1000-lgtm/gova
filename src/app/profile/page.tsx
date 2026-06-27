'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';

import { ContactInfoCard } from '@/components/profile/ContactInfoCard';
import { ProfileRegistrationInfoCard } from '@/components/profile/ProfileRegistrationInfoCard';
import { useSession } from '@/features/auth/hooks/use-session-query';
import { useTranslation } from '@/lib/i18n';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="container px-4 py-8 text-sm text-on-surface-variant">
        {t('profile.loading')}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container px-4 py-8 max-w-lg mx-auto text-center space-y-4">
        <p className="text-on-surface-variant">{t('profile.loginRequired')}</p>
        <Link href="/login" className="inline-flex items-center gap-2 auth-cta px-6 h-11">
          <LogIn className="h-4 w-4" />
          {t('sidebar.login')}
        </Link>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">{t('nav.profile')}</h1>
        <p className="text-sm text-on-surface-variant mt-1">{t('profile.subtitle')}</p>
      </div>

      <ProfileRegistrationInfoCard />

      <ContactInfoCard hidePrimarySection />
    </div>
  );
}
