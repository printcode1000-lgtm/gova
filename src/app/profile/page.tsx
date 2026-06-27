'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import * as React from 'react';

import { ProfileContactsCard } from '@/components/profile/ProfileContactsCard';
import { ProfileRegistrationInfoCard } from '@/components/profile/ProfileRegistrationInfoCard';
import { useSession } from '@/features/auth/components/SessionProvider';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { isLoggedIn, isLoading } = useSession();
  const [activeTab, setActiveTab] = React.useState<'registration' | 'contact'>('registration');
  const [showEditCard, setShowEditCard] = React.useState(false);

  React.useEffect(() => {
    const handleToggleEditCard = (event: CustomEvent<boolean>) => {
      setShowEditCard(event.detail);
    };

    window.addEventListener('toggle-edit-card', handleToggleEditCard as EventListener);

    return () => {
      window.removeEventListener('toggle-edit-card', handleToggleEditCard as EventListener);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="container px-4 py-8 text-sm text-on-surface-variant">
        {t('profile.loading')}
      </div>
    );
  }

  if (!isLoggedIn) {
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
    <div className="container px-4 py-8">
      <Card id="edit-profile-card" className={!showEditCard ? 'hidden' : ''}>
        <CardContent className="p-0">
          <div className="flex gap-2 border-b border-outline-variant">
            <button
              type="button"
              onClick={() => setActiveTab('registration')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'registration'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t('onboarding.contactInfo.primaryContact')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contact')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'contact'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t('onboarding.contactInfo.additionalContact')}
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'registration' ? (
              <ProfileRegistrationInfoCard />
            ) : (
              <ProfileContactsCard />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
