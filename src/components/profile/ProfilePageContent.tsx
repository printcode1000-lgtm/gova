"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  LogIn,
  Save,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserCircle,
  faStar,
  faTags,
  faAddressBook,
  faBuilding,
} from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import Image from "next/image";

import { BOTTOM_NAV_CLEARANCE } from "@/components/layouts/bottom-nav-layout";
import { ProfileContactsCard } from "@/components/profile/ProfileContactsCard";
import { ProfileRegistrationInfoCard } from "@/components/profile/ProfileRegistrationInfoCard";
import { SpecialtiesCard } from "@/components/profile/SpecialtiesCard";
import { ProductsCard } from "@/components/profile/ProductsCard";
import { StoreIdentityCard } from "@/components/profile/StoreIdentityCard";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeroSlider, type HeroSliderConfig } from "@/components/ui/HeroSlider";
import { ProductReviews } from "@/components/product/ProductReviews";
import { useProfileStoreImages } from "@/features/profile/hooks/use-profile-store-images";
import { useStoreDetails } from "@/features/profile/hooks/use-store-details";
import type {
  ProfileContactsController,
  ProfileRegistrationController,
  ProfileSpecialtiesController,
  StoreDetailsController,
} from "./profile-save-controller";
import type { ProfileEditTab, ProfileSectionStatus } from "./profile-page.types";
import { PROFILE_SECTION_IDS, PROFILE_SECTIONS } from "./profile-page.types";
import { useProfileNavigation } from "./use-profile-navigation";
import { useProfileSave } from "./use-profile-save";

export function ProfilePageContent() {
  const { t, locale } = useTranslation();
  const { session, isLoggedIn, isLoading, setSession } = useSession();
  const superAdmin = isSuperAdmin(session);
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const uid = searchParams.get("uid");
  const isViewingOtherProfile = !!uid;
  const showEditCard = mode === "edit" && !isViewingOtherProfile;
  const showPreviewCard = mode !== "edit" || isViewingOtherProfile;
  const { storeImages, isLoading: isLoadingStoreImages } =
    useProfileStoreImages(isViewingOtherProfile ? uid : undefined);
  const { details: storeDetails, isLoading: isLoadingStoreDetails } =
    useStoreDetails(isViewingOtherProfile ? uid : undefined);

  const registrationRef = React.useRef<ProfileRegistrationController>(null);
  const specialtiesRef = React.useRef<ProfileSpecialtiesController>(null);
  const productsRef = React.useRef<ProfileSpecialtiesController>(null);
  const contactsRef = React.useRef<ProfileContactsController>(null);
  const storeRef = React.useRef<StoreDetailsController>(null);

  const {
    activeTab,
    carouselHeight,
    carouselRef,
    panelRefs,
    navButtonRefs,
    activeSectionIndex,
    handleCarouselScroll,
    selectSection,
    goToAdjacentSection,
  } = useProfileNavigation({
    showEditCard,
    isLoading,
    isLoggedIn,
  });

  const {
    sectionStatuses,
    saveError,
    isUnifiedSaving,
    saveDialog,
    handleRegistrationStatus,
    handleSpecialtiesStatus,
    handleProductsStatus,
    handleContactStatus,
    handleStoreStatus,
    handleSaveChangedSections,
    setSaveDialog,
  } = useProfileSave({
    session,
    locale,
    t,
    setActiveTab: selectSection,
    setSession,
  });

  const [isStoryExpanded, setIsStoryExpanded] = React.useState(false);

  const heroSliderConfig = useMemo<HeroSliderConfig>(() => {
    const slides = storeImages.coverUrls.map((url, index) => ({
      priority: (index + 1) * 100,
      image: url,
      imageKey: storeImages.coverImageKeys[index],
      title: "",
      subtitle: "",
      duration: 4000,
      action: "",
    }));

    return {
      transition: "SlideLeft",
      transitionDuration: 500,
      autoPlay: true,
      loop: true,
      slides,
    };
  }, [storeImages.coverImageKeys, storeImages.coverUrls]);

  const dirtySections = (
    Object.entries(sectionStatuses) as Array<
      [ProfileEditTab, ProfileSectionStatus | null]
    >
  ).filter(([, status]) => status?.isDirty);
  const dirtyLabels = dirtySections
    .map(([, status]) => status?.label)
    .filter((label): label is string => Boolean(label));
  const isSaveBlocked = dirtySections.some(([, status]) => !status?.canSave);

  if (isLoading) {
    return (
      <div className="container px-4 py-8 text-sm text-on-surface-variant">
        {t("profile.loading")}
      </div>
    );
  }

  if (!isLoggedIn && !isViewingOtherProfile) {
    return (
      <div className="container px-4 py-8 max-w-lg mx-auto text-center space-y-4">
        <p className="text-on-surface-variant">{t("profile.loginRequired")}</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 auth-cta px-6 h-11"
        >
          <LogIn className="h-4 w-4" />
          {t("sidebar.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="container px-3 py-4 sm:px-5 sm:py-8 lg:px-6">
      {showPreviewCard ? (
        <div className="mx-auto w-full max-w-6xl px-0 sm:px-4">
          {isLoadingStoreImages ? (
            <div className="py-8 text-center text-sm text-on-surface-variant">
              {t("profile.loading")}
            </div>
          ) : (
            <div className="mb-0">
              <HeroSlider mode="view" config={heroSliderConfig} />
            </div>
          )}
          {!isLoadingStoreDetails && (
            <section className="mx-2 sm:mx-4 border-b border-outline-variant/60 pb-4 sm:pb-5">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                {storeImages.avatarUrl ? (
                  <div className="relative z-10 -mt-8 sm:-mt-10 h-20 w-20 sm:h-28 sm:w-28 flex-shrink-0 overflow-hidden rounded-full border-4 border-surface shadow-lg">
                    <Image
                      src={storeImages.avatarUrl}
                      alt="Avatar"
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}

                <div className="min-w-0 flex-1 pt-2 sm:pt-3">
                  {storeDetails.storeName ? (
                    <h1 className="break-words text-lg sm:text-xl font-bold leading-7 text-on-surface sm:text-2xl">
                      {storeDetails.storeName}
                    </h1>
                  ) : null}
                  {storeDetails.storeDescription ? (
                    <p className="mt-1 line-clamp-2 break-words text-xs sm:text-sm leading-5 sm:leading-6 text-on-surface-variant">
                      {storeDetails.storeDescription}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          )}
          {!isLoadingStoreDetails && storeDetails.storeStory ? (
            <section className="mx-2 sm:mx-4 mt-4 sm:mt-5 space-y-2">
              <button
                type="button"
                onClick={() => setIsStoryExpanded(!isStoryExpanded)}
                className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-on-surface hover:text-primary transition-colors"
              >
                {t("onboarding.storeIdentity.storeStory")}
                {isStoryExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {isStoryExpanded && (
                <p className="text-xs sm:text-sm leading-5 sm:leading-6 text-on-surface-variant">
                  {storeDetails.storeStory}
                </p>
              )}
            </section>
          ) : null}

          {/* Profile Reviews Section */}
          {!isLoadingStoreDetails && storeDetails.ratingSettings?.enabled && (
            <section className="mx-2 sm:mx-4 mt-8 sm:mt-12 border-t border-outline-variant/60 pt-8 pb-12">
              <ProductReviews
                type="profile"
                targetUid={uid || session?.uid || ""}
                ownerUid={uid || session?.uid || ""}
                productName={storeDetails.storeName || t("profile.title")}
                reviewsEnabled={true}
                targetEnabled={true}
                commentsEnabled={storeDetails.ratingSettings.mode === "stars-comments"}
              />
            </section>
          )}
        </div>
      ) : showEditCard ? (
        <div
          id="edit-profile-card"
          className="mx-auto w-full max-w-4xl space-y-3 sm:space-y-4"
        >
          <div className="sticky top-0 z-30 w-full bg-surface-container-low/60 relative">
            <div
              className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 py-3 sm:gap-3 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label={t("profile.subtitle")}
            >
                  <button
                    ref={(node) => {
                      navButtonRefs.current.registration = node;
                    }}
                    type="button"
                    onClick={() => selectSection("registration")}
                    aria-pressed={activeTab === "registration"}
                    aria-controls={PROFILE_SECTION_IDS.registration}
                    className={`flex h-auto min-w-fit flex-shrink-0 snap-center flex-col items-center gap-1 rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors sm:px-4 sm:text-xs ${
                      activeTab === "registration"
                        ? "border-primary bg-primary text-on-primary shadow-sm"
                        : "border-outline-variant bg-surface text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
                    }`}
                  >
                    <FontAwesomeIcon icon={faUserCircle} className="h-6 w-6" />
                    <span className="whitespace-nowrap text-center">
                      {t("onboarding.contactInfo.primaryContact")}
                    </span>
                    {sectionStatuses.registration?.isDirty ? (
                      <span className="h-2 w-2 rounded-full bg-error ring-2 ring-surface" />
                    ) : null}
                  </button>
                  <button
                    ref={(node) => {
                      navButtonRefs.current.specialties = node;
                    }}
                    type="button"
                    onClick={() => selectSection("specialties")}
                    aria-pressed={activeTab === "specialties"}
                    aria-controls={PROFILE_SECTION_IDS.specialties}
                    className={`flex h-auto min-w-fit flex-shrink-0 snap-center flex-col items-center gap-1 rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors sm:px-4 sm:text-xs ${
                      activeTab === "specialties"
                        ? "border-primary bg-primary text-on-primary shadow-sm"
                        : "border-outline-variant bg-surface text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
                    }`}
                  >
                    <FontAwesomeIcon icon={faStar} className="h-6 w-6" />
                    <span className="whitespace-nowrap text-center">
                      {t("onboarding.storeIdentity.specialties")}
                    </span>
                    {sectionStatuses.specialties?.isDirty ? (
                      <span className="h-2 w-2 rounded-full bg-error ring-2 ring-surface" />
                    ) : null}
                  </button>
                  <button
                    ref={(node) => {
                      navButtonRefs.current.products = node;
                    }}
                    type="button"
                    onClick={() => selectSection("products")}
                    aria-pressed={activeTab === "products"}
                    aria-controls={PROFILE_SECTION_IDS.products}
                    className={`flex h-auto min-w-fit flex-shrink-0 snap-center flex-col items-center gap-1 rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors sm:px-4 sm:text-xs ${
                      activeTab === "products"
                        ? "border-primary bg-primary text-on-primary shadow-sm"
                        : "border-outline-variant bg-surface text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
                    }`}
                  >
                    <FontAwesomeIcon icon={faTags} className="h-6 w-6" />
                    <span className="whitespace-nowrap text-center">
                      {t("onboarding.storeIdentity.products")}
                    </span>
                    {sectionStatuses.products?.isDirty ? (
                      <span className="h-2 w-2 rounded-full bg-error ring-2 ring-surface" />
                    ) : null}
                  </button>
                  <button
                    ref={(node) => {
                      navButtonRefs.current.contact = node;
                    }}
                    type="button"
                    onClick={() => selectSection("contact")}
                    aria-pressed={activeTab === "contact"}
                    aria-controls={PROFILE_SECTION_IDS.contact}
                    className={`flex h-auto min-w-fit flex-shrink-0 snap-center flex-col items-center gap-1 rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors sm:px-4 sm:text-xs ${
                      activeTab === "contact"
                        ? "border-primary bg-primary text-on-primary shadow-sm"
                        : "border-outline-variant bg-surface text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
                    }`}
                  >
                    <FontAwesomeIcon icon={faAddressBook} className="h-6 w-6" />
                    <span className="whitespace-nowrap text-center">
                      {t("onboarding.contactInfo.additionalContact")}
                    </span>
                    {sectionStatuses.contact?.isDirty ? (
                      <span className="h-2 w-2 rounded-full bg-error ring-2 ring-surface" />
                    ) : null}
                  </button>
                  <button
                    ref={(node) => {
                      navButtonRefs.current.store = node;
                    }}
                    type="button"
                    onClick={() => selectSection("store")}
                    aria-pressed={activeTab === "store"}
                    aria-controls={PROFILE_SECTION_IDS.store}
                    className={`flex h-auto min-w-fit flex-shrink-0 snap-center flex-col items-center gap-1 rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors sm:px-4 sm:text-xs ${
                      activeTab === "store"
                        ? "border-primary bg-primary text-on-primary shadow-sm"
                        : "border-outline-variant bg-surface text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
                    }`}
                  >
                    <FontAwesomeIcon icon={faBuilding} className="h-6 w-6" />
                    <span className="whitespace-nowrap text-center">
                      {t("onboarding.storeIdentity.title")}
                    </span>
                    {sectionStatuses.store?.isDirty ? (
                      <span className="h-2 w-2 rounded-full bg-error ring-2 ring-surface" />
                    ) : null}
                  </button>
                </div>
                <div className="pointer-events-none absolute inset-y-0 start-0 w-5 bg-gradient-to-r from-surface-container-low/95 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 end-0 w-5 bg-gradient-to-l from-surface-container-low/95 to-transparent" />
              </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative">
                <div
                  ref={carouselRef}
                  onScroll={handleCarouselScroll}
                  style={
                    carouselHeight ? { height: carouselHeight } : undefined
                  }
                  className="flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth transition-[height] duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <div
                    ref={(node) => {
                      panelRefs.current.registration = node;
                    }}
                    id={PROFILE_SECTION_IDS.registration}
                    role="region"
                    aria-hidden={activeTab !== "registration"}
                    inert={activeTab !== "registration"}
                    className="min-w-full snap-center p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileRegistrationInfoCard
                      ref={registrationRef}
                      showSaveButton={false}
                      onStatusChange={handleRegistrationStatus}
                    />
                  </div>
                  <div
                    ref={(node) => {
                      panelRefs.current.specialties = node;
                    }}
                    id={PROFILE_SECTION_IDS.specialties}
                    role="region"
                    aria-hidden={activeTab !== "specialties"}
                    inert={activeTab !== "specialties"}
                    className="min-w-full snap-center p-3 sm:p-5 lg:p-6"
                  >
                    <SpecialtiesCard
                      uid={session?.uid ?? ""}
                      ref={specialtiesRef}
                      showSaveButton={false}
                      onStatusChange={handleSpecialtiesStatus}
                      unlimited={superAdmin}
                    />
                  </div>
                  <div
                    ref={(node) => {
                      panelRefs.current.products = node;
                    }}
                    id={PROFILE_SECTION_IDS.products}
                    role="region"
                    aria-hidden={activeTab !== "products"}
                    inert={activeTab !== "products"}
                    className="min-w-full snap-center p-3 sm:p-5 lg:p-6"
                  >
                    <ProductsCard
                      uid={session?.uid ?? ""}
                      ref={productsRef}
                      showSaveButton={false}
                      onStatusChange={handleProductsStatus}
                    />
                  </div>
                  <div
                    ref={(node) => {
                      panelRefs.current.contact = node;
                    }}
                    id={PROFILE_SECTION_IDS.contact}
                    role="region"
                    aria-hidden={activeTab !== "contact"}
                    inert={activeTab !== "contact"}
                    className="min-w-full snap-center p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileContactsCard
                      ref={contactsRef}
                      showSaveButton={false}
                      onStatusChange={handleContactStatus}
                    />
                  </div>
                  <div
                    ref={(node) => {
                      panelRefs.current.store = node;
                    }}
                    id={PROFILE_SECTION_IDS.store}
                    role="region"
                    aria-hidden={activeTab !== "store"}
                    inert={activeTab !== "store"}
                    className="min-w-full snap-center p-3 sm:p-5 lg:p-6"
                  >
                    <StoreIdentityCard
                      ref={storeRef}
                      showSaveButton={false}
                      onStatusChange={handleStoreStatus}
                    />
                  </div>
                </div>
              </div>

              <div
                className="flex items-center justify-center gap-4 border-t border-outline-variant/50 py-3"
                aria-hidden="true"
              >
                <button
                  type="button"
                  onClick={() => goToAdjacentSection(-1)}
                  disabled={activeSectionIndex === 0}
                  aria-label={
                    locale === "ar" ? "القسم السابق" : "Previous section"
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface/95 text-on-surface shadow-md transition hover:bg-surface-container disabled:pointer-events-none disabled:opacity-25"
                >
                  {locale === "ar" ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </button>
                <div className="flex justify-center gap-2">
                  {PROFILE_SECTIONS.map((section) => (
                    <span
                      key={section}
                      className={`h-2 rounded-full transition-all ${activeTab === section ? "w-6 bg-primary" : "w-2 bg-outline-variant"}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => goToAdjacentSection(1)}
                  disabled={activeSectionIndex === PROFILE_SECTIONS.length - 1}
                  aria-label={locale === "ar" ? "القسم التالي" : "Next section"}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface/95 text-on-surface shadow-md transition hover:bg-surface-container disabled:pointer-events-none disabled:opacity-25"
                >
                  {locale === "ar" ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>

              {saveError ? (
                <div className="mx-3 mb-3 rounded-lg bg-error/15 px-3 py-2 text-sm text-error sm:mx-5">
                  {saveError}
                </div>
              ) : null}

              {dirtyLabels.length > 0 ? (
                <div
                  className="mx-3 mb-3 rounded-2xl border border-outline-variant bg-surface/95 p-3 shadow-xl backdrop-blur sm:mx-5 sm:mb-5 sm:rounded-xl"
                >
                  <p className="mb-2 line-clamp-1 text-xs text-on-surface-variant">
                    {t("profile.saveTargets")}: {dirtyLabels.join("، ")}
                  </p>
                  <Button
                    type="button"
                    className="w-full gap-2 auth-cta h-11"
                    onClick={() => handleSaveChangedSections(
                      registrationRef.current,
                      contactsRef.current,
                      storeRef.current,
                      specialtiesRef.current,
                      productsRef.current
                    )}
                    disabled={isUnifiedSaving || isSaveBlocked}
                  >
                    {isUnifiedSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isUnifiedSaving ? t("profile.saving") : t("profile.save")}
                  </Button>
                </div>
              ) : null}

              {/* Save Result Dialog */}
              {saveDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-surface rounded-xl shadow-xl max-w-sm w-full p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {saveDialog.type === 'success' ? (
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                        </div>
                      ) : (
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-error" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-on-surface">
                          {saveDialog.type === 'success'
                            ? (locale === 'ar' ? 'نجاح' : 'Success')
                            : (locale === 'ar' ? 'خطأ' : 'Error')}
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-1">
                          {saveDialog.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        onClick={() => setSaveDialog(null)}
                        className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors h-9"
                      >
                        {locale === 'ar' ? 'إغلاق' : 'Close'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
