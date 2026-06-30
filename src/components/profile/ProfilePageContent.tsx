'use client';

import Link from 'next/link';
import { Loader2, LogIn, Phone, Save, Store, User } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { HeroSlider, type HeroSliderConfig } from '@/components/ui/HeroSlider';
import { useProfileStoreImages } from '@/features/profile/hooks/use-profile-store-images';
import { useStoreDetails } from '@/features/profile/hooks/use-store-details';
import { profileService } from '@/features/profile/services/profile-service';
import { mergePrimaryContacts } from '@/features/profile/utils/merge-primary-contacts';
import type {
  ProfileContactsController,
  ProfileRegistrationController,
  ProfileSectionStatus,
  StoreDetailsController,
} from './profile-save-controller';

type ProfileEditTab = 'registration' | 'contact' | 'store';

export function ProfilePageContent() {
  const { t } = useTranslation();
  const { session, isLoggedIn, isLoading } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] =
    React.useState<ProfileEditTab>('registration');
  const registrationRef = React.useRef<ProfileRegistrationController>(null);
  const contactsRef = React.useRef<ProfileContactsController>(null);
  const storeRef = React.useRef<StoreDetailsController>(null);
  const [sectionStatuses, setSectionStatuses] = React.useState<
    Record<ProfileEditTab, ProfileSectionStatus | null>
  >({
    registration: null,
    contact: null,
    store: null,
  });
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isUnifiedSaving, setIsUnifiedSaving] = React.useState(false);
  const showEditCard = searchParams.get('mode') === 'edit';
  const showPreviewCard = searchParams.get('mode') === 'preview';
  const { storeImages, isLoading: isLoadingStoreImages } =
    useProfileStoreImages();
  const { details: storeDetails, isLoading: isLoadingStoreDetails } =
    useStoreDetails();

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

  const updateSectionStatus = React.useCallback(
    (section: ProfileEditTab, status: ProfileSectionStatus) => {
      setSectionStatuses((current) => {
        const previous = current[section];
        if (
          previous?.isDirty === status.isDirty &&
          previous?.isSaving === status.isSaving &&
          previous?.canSave === status.canSave &&
          previous?.label === status.label
        ) {
          return current;
        }
        return { ...current, [section]: status };
      });
    },
    [],
  );

  const handleRegistrationStatus = React.useCallback(
    (status: ProfileSectionStatus) =>
      updateSectionStatus('registration', status),
    [updateSectionStatus],
  );
  const handleContactStatus = React.useCallback(
    (status: ProfileSectionStatus) => updateSectionStatus('contact', status),
    [updateSectionStatus],
  );
  const handleStoreStatus = React.useCallback(
    (status: ProfileSectionStatus) => updateSectionStatus('store', status),
    [updateSectionStatus],
  );

  const dirtySections = (
    Object.entries(sectionStatuses) as Array<
      [ProfileEditTab, ProfileSectionStatus | null]
    >
  ).filter(([, status]) => status?.isDirty);
  const dirtyLabels = dirtySections
    .map(([, status]) => status?.label)
    .filter((label): label is string => Boolean(label));
  const isSaveBlocked = dirtySections.some(([, status]) => !status?.canSave);
  const handleSaveChangedSections = async () => {
    setSaveError(null);
    const registrationController = registrationRef.current;
    const contactsController = contactsRef.current;
    const storeController = storeRef.current;
    if (
      !session?.uid ||
      !registrationController ||
      !contactsController ||
      !storeController
    ) {
      return;
    }

    const registration = registrationController.prepareSnapshot();
    if (!registration) {
      setActiveTab('registration');
      return;
    }

    const changedSections = dirtySections.map(([section]) => section);
    const contacts = mergePrimaryContacts(
      registration,
      contactsController.getSnapshot(),
    );
    const storeDetails = storeController.getSnapshot();

    try {
      setIsUnifiedSaving(true);
      const saved = await profileService.saveEditor({
        uid: session.uid,
        changedSections,
        registration,
        contacts,
        storeDetails,
      });

      if (changedSections.includes('registration')) {
        await registrationController.applySaved(saved.registration);
      }
      if (
        changedSections.includes('registration') ||
        changedSections.includes('contact')
      ) {
        contactsController.applySaved(saved.contacts);
      }
      if (changedSections.includes('store')) {
        storeController.applySaved(saved.storeDetails);
      }
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'phoneVerificationRequired') {
        setActiveTab('registration');
        setSaveError(t('auth.registration.phoneVerificationRequired'));
      } else if (message === 'invalidCurrentPassword') {
        setActiveTab('registration');
        setSaveError(t('profile.validation.invalidCurrentPassword'));
      } else if (message === 'phoneAlreadyRegistered') {
        setActiveTab('registration');
        setSaveError(t('auth.validation.phoneAlreadyRegistered'));
      } else {
        setSaveError(message);
      }
    } finally {
      setIsUnifiedSaving(false);
    }
  };

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
        <Link
          href="/login"
          className="inline-flex items-center gap-2 auth-cta px-6 h-11"
        >
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
          ) : isLoadingStoreImages ? (
            <div className="py-8 text-center text-sm text-on-surface-variant">
              {t('profile.loading')}
            </div>
          ) : (
            <div className="text-center text-on-surface-variant py-8">
              {t('profile.noImages')}
            </div>
          )}
          {!isLoadingStoreDetails && (
            <section className="mx-4 border-b border-outline-variant/60 pb-5">
              <div className="flex min-w-0 items-start gap-4">
                {storeImages.avatarUrl ? (
                  <div className="relative z-10 -mt-10 h-28 w-28 flex-shrink-0 overflow-hidden rounded-full border-4 border-surface shadow-lg">
                    <Image
                      src={storeImages.avatarUrl}
                      alt="Avatar"
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}

                <div className="min-w-0 flex-1 pt-3">
                  {storeDetails.storeName ? (
                    <h1 className="break-words text-xl font-bold leading-7 text-on-surface sm:text-2xl">
                      {storeDetails.storeName}
                    </h1>
                  ) : null}
                  {storeDetails.storeDescription ? (
                    <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-on-surface-variant">
                      {storeDetails.storeDescription}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          )}
          {!isLoadingStoreDetails && storeDetails.storeStory ? (
            <section className="mx-4 mt-5 space-y-2">
              <h2 className="text-sm font-semibold text-on-surface">
                {t('onboarding.storeIdentity.storeStory')}
              </h2>
              <p className="text-sm leading-6 text-on-surface-variant">
                {storeDetails.storeStory}
              </p>
            </section>
          ) : null}
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
                <span className="text-xs font-medium">
                  {t('onboarding.contactInfo.primaryContact')}
                </span>
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
                <span className="text-xs font-medium">
                  {t('onboarding.contactInfo.additionalContact')}
                </span>
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
                <span className="text-xs font-medium">
                  {t('onboarding.storeIdentity.title')}
                </span>
              </button>
            </div>

            <div className="p-6">
              <div
                className={activeTab === 'registration' ? 'block' : 'hidden'}
              >
                <ProfileRegistrationInfoCard
                  ref={registrationRef}
                  showSaveButton={false}
                  onStatusChange={handleRegistrationStatus}
                />
              </div>
              <div className={activeTab === 'contact' ? 'block' : 'hidden'}>
                <ProfileContactsCard
                  ref={contactsRef}
                  showSaveButton={false}
                  onStatusChange={handleContactStatus}
                />
              </div>
              <div className={activeTab === 'store' ? 'block' : 'hidden'}>
                <StoreIdentityCard
                  ref={storeRef}
                  showSaveButton={false}
                  onStatusChange={handleStoreStatus}
                />
              </div>

              {saveError ? (
                <div className="mt-5 rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
                  {saveError}
                </div>
              ) : null}

              {dirtyLabels.length > 0 ? (
                <div className="mt-6 border-t border-outline-variant pt-4">
                  <p className="mb-3 text-xs text-on-surface-variant">
                    {t('profile.saveTargets')}: {dirtyLabels.join('، ')}
                  </p>
                  <Button
                    type="button"
                    className="w-full gap-2 auth-cta h-11"
                    onClick={handleSaveChangedSections}
                    disabled={isUnifiedSaving || isSaveBlocked}
                  >
                    {isUnifiedSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isUnifiedSaving ? t('profile.saving') : t('profile.save')}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
