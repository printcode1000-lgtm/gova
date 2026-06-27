'use client';

import Link from 'next/link';
import { LogIn, User, Phone, Store } from 'lucide-react';
import * as React from 'react';

import { ProfileContactsCard } from '@/components/profile/ProfileContactsCard';
import { ProfileRegistrationInfoCard } from '@/components/profile/ProfileRegistrationInfoCard';
import { StoreIdentityCard } from '@/components/profile/StoreIdentityCard';
import { useSession } from '@/features/auth/components/SessionProvider';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { isLoggedIn, isLoading } = useSession();
  const [activeTab, setActiveTab] = React.useState<'registration' | 'contact' | 'store'>('registration');
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
          <div className="flex gap-4 border-b border-outline-variant px-6 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('registration')}
              className={`flex flex-col items-center gap-1 pb-3 px-4 transition-colors ${
                activeTab === 'registration'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface border-b-2 border-transparent'
              }`}
            >
              <User className="h-5 w-5" />
              <span className="text-xs font-medium">{t('onboarding.contactInfo.primaryContact')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contact')}
              className={`flex flex-col items-center gap-1 pb-3 px-4 transition-colors ${
                activeTab === 'contact'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface border-b-2 border-transparent'
              }`}
            >
              <Phone className="h-5 w-5" />
              <span className="text-xs font-medium">{t('onboarding.contactInfo.additionalContact')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('store')}
              className={`flex flex-col items-center gap-1 pb-3 px-4 transition-colors ${
                activeTab === 'store'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface border-b-2 border-transparent'
              }`}
            >
              <Store className="h-5 w-5" />
              <span className="text-xs font-medium">{t('onboarding.storeIdentity.title')}</span>
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'registration' ? (
              <ProfileRegistrationInfoCard />
            ) : activeTab === 'contact' ? (
              <ProfileContactsCard />
            ) : (
              <StoreIdentityCard />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
