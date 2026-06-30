'use client';

import Link from 'next/link';
import { LogIn, User, Phone, Store } from 'lucide-react';
import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import Image from 'next/image';

import { ProfileContactsCard } from '@/components/profile/ProfileContactsCard';
import { ProfileRegistrationInfoCard } from '@/components/profile/ProfileRegistrationInfoCard';
import { StoreIdentityCard } from '@/components/profile/StoreIdentityCard';
import { useSession } from '@/features/auth/components/SessionProvider';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { HeroSlider, type HeroSliderConfig } from '@/components/ui/HeroSlider';
import { useProfileStoreImages } from '@/features/profile/hooks/use-profile-store-images';

export function ProfilePageContent() {
  const { t } = useTranslation();
  const { isLoggedIn, isLoading } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = React.useState<'registration' | 'contact' | 'store'>('registration');
  const showEditCard = searchParams.get('mode') === 'edit';
  const showPreviewCard = searchParams.get('mode') === 'preview';
  const { storeImages, isLoading: isLoadingStoreImages } = useProfileStoreImages();

  const heroSliderConfig = useMemo<HeroSliderConfig>(() => {
    const slides = storeImages.coverUrls.map((url, index) => ({
      priority: index + 1,
      image: url,
      title: '',
      subtitle: '',
      duration: 4000,
      action: '',
    }));

    return {
      transition: 'SlideLeft',
      transitionDuration: 500,
      autoPlay: true,
      loop: true,
      slides,
    };
  }, [storeImages.coverUrls]);

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
      {showPreviewCard ? (
        <div className="px-4">
          {heroSliderConfig.slides.length > 0 ? (
            <div className="mb-0">
              <HeroSlider config={heroSliderConfig} />
            </div>
          ) : (
            <div className="text-center text-on-surface-variant py-8">
              {t('profile.noImages')}
            </div>
          )}
          {storeImages.avatarUrl && (
            <div className="flex justify-center relative -mt-20">
              <div className="w-28 h-28 rounded-full overflow-hidden z-10 border-2 border-white shadow-md relative flex-shrink-0">
                <Image
                  src={storeImages.avatarUrl}
                  alt="Avatar"
                  width={112}
                  height={112}
                  className="w-full h-full object-fill"
                />
              </div>
            </div>
          )}
        </div>
      ) : (
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
      )}
    </div>
  );
}
