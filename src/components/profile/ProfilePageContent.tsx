"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogIn,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBuilding,
  faCircleCheck,
  faClock,
  faComments,
  faFloppyDisk,
  faListCheck,
  faPenToSquare,
  faStar,
  faTags,
  faTruckFast,
  faTriangleExclamation,
  faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { BOTTOM_NAV_CLEARANCE } from "@/components/layouts/bottom-nav-layout";
import { ProfileContactsCard } from "@/components/profile/ProfileContactsCard";
import { ProfileRegistrationInfoCard } from "@/components/profile/ProfileRegistrationInfoCard";
import { SpecialtiesCard } from "@/components/profile/SpecialtiesCard";
import { ProductsCard } from "@/components/profile/ProductsCard";
import { StoreIdentityCard } from "@/components/profile/StoreIdentityCard";
import { FulfillmentSettingsCard } from "@/components/profile/FulfillmentSettingsCard";
import { WorkingHoursProfileCard } from "@/components/profile/WorkingHoursProfileCard";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FeaturedMarqueeConfig } from "@/components/ui/FeaturedMarquee";
import type { HeroSliderConfig } from "@/components/ui/HeroSlider";
import type { TrendingRibbonConfig } from "@/components/ui/TrendingRibbon";
import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import { productApiService } from "@/features/product/services/product-api-service";
import { usePageSnapshot } from "@/features/page-snapshot";
import { useProfileStoreImages } from "@/features/profile/hooks/use-profile-store-images";
import { useStoreDetails } from "@/features/profile/hooks/use-store-details";
import { useProfilePublicContacts } from "@/features/profile/hooks/use-profile-public-contacts";
import { useProfilePublicFulfillmentSettings } from "@/features/profile/hooks/use-profile-public-fulfillment-settings";
import { ProfilePreviewContent } from "./ProfilePreviewContent";
import type {
  ProfileContactsController,
  ProfileRegistrationController,
  ProfileSpecialtiesController,
  ProfileFulfillmentController,
  StoreDetailsController,
} from "./profile-save-controller";
import type {
  ProfileEditTab,
  ProfileSectionStatus,
} from "./profile-page.types";
import { PROFILE_SECTION_IDS, PROFILE_SECTIONS } from "./profile-page.types";
import { useProfileNavigation } from "./use-profile-navigation";
import { useProfileSave } from "./use-profile-save";

const PROFILE_EDIT_TAB_COLORS: Record<ProfileEditTab, string> = {
  registration: "#7C3AED",
  specialties: "#D97706",
  products: "#16A34A",
  contact: "#2563EB",
  store: "#4F46E5",
  workingHours: "#EA580C",
  fulfillment: "#0891B2",
};

const PROFILE_EDIT_TAB_ICONS: Record<ProfileEditTab, IconDefinition> = {
  registration: faUserCircle,
  specialties: faStar,
  products: faTags,
  contact: faComments,
  store: faBuilding,
  workingHours: faClock,
  fulfillment: faTruckFast,
};

export function ProfilePageContent() {
  const { t, locale } = useTranslation();
  const router = useRouter();
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
  const previewUid = showPreviewCard ? uid || session?.uid || "" : "";
  const isPreviewOwner = Boolean(
    session?.uid && previewUid && session.uid === previewUid,
  );
  const { contacts: previewContacts, isLoading: isLoadingPreviewContacts } =
    useProfilePublicContacts(previewUid);
  const {
    settings: previewFulfillment,
    isLoading: isLoadingPreviewFulfillment,
  } = useProfilePublicFulfillmentSettings(previewUid);

  const registrationRef = React.useRef<ProfileRegistrationController>(null);
  const specialtiesRef = React.useRef<ProfileSpecialtiesController>(null);
  const productsRef = React.useRef<ProfileSpecialtiesController>(null);
  const contactsRef = React.useRef<ProfileContactsController>(null);
  const storeRef = React.useRef<StoreDetailsController>(null);
  const workingHoursRef = React.useRef<StoreDetailsController>(null);
  const fulfillmentRef = React.useRef<ProfileFulfillmentController>(null);

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
    handleWorkingHoursStatus,
    handleFulfillmentStatus,
    handleSaveChangedSections,
    setSaveDialog,
  } = useProfileSave({
    session,
    locale,
    t,
    setActiveTab: selectSection,
    setSession,
  });
  const editSnapshotReady = showEditCard && !isLoading && isLoggedIn;
  const { restoreSnapshot: restoreEditSnapshot } = usePageSnapshot({
    restoreWhen: editSnapshotReady,
  });
  const restoredEditSnapshotRef = React.useRef(false);

  const [featuredProducts, setFeaturedProducts] = React.useState<
    ProductRecord[]
  >([]);
  const [isLoadingFeaturedProducts, setIsLoadingFeaturedProducts] =
    React.useState(false);

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

  React.useEffect(() => {
    const ids = storeDetails.profileShowcase?.featuredProductIds ?? [];
    if (!showPreviewCard || ids.length === 0) {
      setFeaturedProducts([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoadingFeaturedProducts(true);
      try {
        const products = await Promise.all(
          ids.map((id) =>
            productApiService
              .get(id, { suppressErrorLog: true })
              .catch(() => null),
          ),
        );
        if (!cancelled) {
          setFeaturedProducts(
            products.filter(
              (product): product is ProductRecord =>
                Boolean(product) &&
                product!.status === "active" &&
                (!previewUid || product!.uid === previewUid),
            ),
          );
        }
      } finally {
        if (!cancelled) setIsLoadingFeaturedProducts(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    previewUid,
    showPreviewCard,
    storeDetails.profileShowcase?.featuredProductIds,
  ]);

  React.useEffect(() => {
    if (!editSnapshotReady) {
      restoredEditSnapshotRef.current = false;
    }
  }, [editSnapshotReady]);

  React.useEffect(() => {
    if (!editSnapshotReady || restoredEditSnapshotRef.current) return;
    restoredEditSnapshotRef.current = true;
    let cancelled = false;
    let userInteracted = false;
    let observer: ResizeObserver | null = null;
    const timers: number[] = [];
    const stopAutomaticRestore = () => {
      userInteracted = true;
    };
    const restore = async () => {
      const snapshot = await restoreEditSnapshot();
      if (!snapshot || cancelled) return;
      const restoreScroll = () => {
        if (cancelled || userInteracted) return;
        for (const [selector, position] of Object.entries(snapshot.scroll.elements)) {
          document.querySelector<HTMLElement>(selector)?.scrollTo({
            left: position.x,
            top: position.y,
            behavior: "auto",
          });
        }
        window.scrollTo({
          left: snapshot.scroll.x,
          top: snapshot.scroll.y,
          behavior: "auto",
        });
      };

      [80, 220, 500, 900, 1600, 2600].forEach((delay) => {
        timers.push(window.setTimeout(restoreScroll, delay));
      });
      observer = new ResizeObserver(restoreScroll);
      observer.observe(document.documentElement);
    };

    window.addEventListener("pointerdown", stopAutomaticRestore, { passive: true });
    window.addEventListener("wheel", stopAutomaticRestore, { passive: true });
    window.addEventListener("touchstart", stopAutomaticRestore, { passive: true });
    window.addEventListener("keydown", stopAutomaticRestore);
    void restore();

    return () => {
      cancelled = true;
      observer?.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("pointerdown", stopAutomaticRestore);
      window.removeEventListener("wheel", stopAutomaticRestore);
      window.removeEventListener("touchstart", stopAutomaticRestore);
      window.removeEventListener("keydown", stopAutomaticRestore);
    };
  }, [editSnapshotReady, restoreEditSnapshot]);

  const profileFeaturedConfig = useMemo<FeaturedMarqueeConfig>(
    () => ({
      sectionTitle: "منتجات مميزة",
      items: featuredProducts.map((product) => {
        const price = Number(product.price.current || 0);
        return {
          id: product.id,
          title: product.mainData.name || "منتج",
          price:
            price > 0
              ? `${price.toLocaleString("ar-EG")} ج.م`
              : "السعر عند الطلب",
          image:
            product.images[0]?.url ||
            "/images/mainCategories/General Services.webp",
          action: `mode=view&productId=${product.id}&mainCategoryId=${product.mainCategoryId}&subcategoryId=${product.subcategoryId}`,
        };
      }),
      onAction: (action) => router.push(`/product?${action}`),
    }),
    [featuredProducts, router],
  );

  const profileTrendingConfig = useMemo<TrendingRibbonConfig>(
    () => ({
      label: storeDetails.profileShowcase?.trending.label || "الأكثر رواجًا",
      items: (storeDetails.profileShowcase?.trending.items ?? []).map(
        (item) => ({
          label: item.label,
          action: "",
        }),
      ),
    }),
    [storeDetails.profileShowcase?.trending],
  );

  const submitProfileCustomRequest = async (input: {
    title: string;
    description: string;
    images: { imageKey: string; url: string }[];
  }) => {
    if (!session?.uid || !previewUid)
      throw new Error("يجب تسجيل الدخول لإرسال الطلب.");
    const result = await asolApi.post<{ orderId: string }>(
      ASOL_API_ROUTES.orders.customRequestFromProfile,
      {
        uid: session.uid,
        phone: session.phone,
        sellerUid: previewUid,
        title: input.title,
        description: input.description,
        images: input.images.map((image) => ({
          imageKey: image.imageKey,
          url: image.url,
        })),
      },
      { suppressErrorLog: true },
    );
    router.push(
      `/orders/details?orderId=${encodeURIComponent(result.orderId)}&role=buyer`,
    );
  };

  const dirtySections = (
    Object.entries(sectionStatuses) as Array<
      [ProfileEditTab, ProfileSectionStatus | null]
    >
  ).filter(([, status]) => status?.isDirty);
  const dirtyLabels = dirtySections
    .map(([, status]) => status?.label)
    .filter((label): label is string => Boolean(label));
  const isSaveBlocked = dirtySections.some(([, status]) => !status?.canSave);
  const saveProfileChanges = React.useCallback(
    () =>
      handleSaveChangedSections(
        registrationRef.current,
        contactsRef.current,
        storeRef.current,
        workingHoursRef.current,
        specialtiesRef.current,
        productsRef.current,
        fulfillmentRef.current,
      ),
    [handleSaveChangedSections],
  );

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
        <ProfilePreviewContent
          locale={locale === "ar" ? "ar" : "en"}
          previewUid={previewUid}
          session={session}
          isOwner={isPreviewOwner}
          isSuperAdmin={superAdmin}
          storeImages={storeImages}
          storeDetails={storeDetails}
          contacts={previewContacts}
          fulfillment={previewFulfillment}
          heroConfig={heroSliderConfig}
          featuredConfig={profileFeaturedConfig}
          trendingConfig={profileTrendingConfig}
          hasFeaturedProducts={featuredProducts.length > 0}
          loading={{
            images: isLoadingStoreImages,
            details: isLoadingStoreDetails,
            contacts: isLoadingPreviewContacts,
            fulfillment: isLoadingPreviewFulfillment,
            featured: isLoadingFeaturedProducts,
          }}
          onCustomRequest={submitProfileCustomRequest}
        />
      ) : showEditCard ? (
        <div
          id="edit-profile-card"
          className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4"
        >
          <div className="order-2 sticky top-12 z-30 w-full overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-low/85 shadow-sm backdrop-blur-xl">
            <div
              data-snapshot-scroll
              data-snapshot-id="profile-edit-tabs-scroll"
              className="flex snap-x snap-mandatory items-stretch gap-1.5 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label={t("profile.subtitle")}
            >
              {PROFILE_SECTIONS.map((section) => {
                const color = PROFILE_EDIT_TAB_COLORS[section];
                const active = activeTab === section;
                const labels: Record<ProfileEditTab, string> = {
                  registration: t("onboarding.contactInfo.primaryContact"),
                  specialties: t("onboarding.storeIdentity.specialties"),
                  products: t("onboarding.storeIdentity.products"),
                  contact: t("onboarding.contactInfo.additionalContact"),
                  store: t("onboarding.storeIdentity.title"),
                  workingHours: locale === "ar" ? "مواعيد العمل" : "Working hours",
                  fulfillment: locale === "ar" ? "الشحن والإرجاع" : "Shipping",
                };

                return (
                  <button
                    key={section}
                    ref={(node) => {
                      navButtonRefs.current[section] = node;
                    }}
                    type="button"
                    onClick={() => selectSection(section)}
                    aria-pressed={active}
                    aria-controls={PROFILE_SECTION_IDS[section]}
                    className="group relative flex h-16 w-16 shrink-0 snap-center flex-col items-center justify-center gap-0 rounded-xl border text-center shadow-sm transition-all duration-200 hover:border-opacity-100 hover:shadow-md active:scale-95"
                    style={{
                      paddingInline: "0.0625rem",
                      paddingBlock: "0.0625rem",
                      background: active
                        ? `linear-gradient(135deg, ${color}26, ${color}10)`
                        : `linear-gradient(135deg, ${color}14, ${color}06)`,
                      borderColor: active ? `${color}AA` : `${color}55`,
                    }}
                  >
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                      {active ? (
                        <>
                          <span
                            className="asol-profile-tab-wave pointer-events-none absolute inset-0 rounded-full"
                            style={{
                              color: `${color}80`,
                              borderColor: `${color}B8`,
                              backgroundColor: `${color}20`,
                            }}
                          />
                          <span
                            className="asol-profile-tab-wave asol-profile-tab-wave--delayed pointer-events-none absolute inset-0 rounded-full"
                            style={{
                              color: `${color}66`,
                              borderColor: `${color}9E`,
                              backgroundColor: `${color}18`,
                            }}
                          />
                        </>
                      ) : null}
                      <FontAwesomeIcon
                        icon={PROFILE_EDIT_TAB_ICONS[section]}
                        className="relative z-10 shrink-0 transition-transform duration-300 group-hover:scale-105"
                        style={{
                          color,
                          width: "2rem",
                          height: "2rem",
                          fontSize: "2rem",
                          filter: active
                            ? `drop-shadow(0 0 0.35rem ${color}55)`
                            : undefined,
                        }}
                      />
                    </span>
                    <span
                      className="line-clamp-2 block w-full text-center font-semibold tracking-tight text-muted-foreground"
                      style={{
                        fontSize: "0.5rem",
                        lineHeight: "0.6rem",
                      }}
                    >
                      {labels[section]}
                    </span>
                    {sectionStatuses[section]?.isDirty ? (
                      <span className="absolute end-1 top-1 h-2.5 w-2.5 rounded-full bg-error ring-2 ring-surface" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {dirtySections.length > 0 ? (
            <div className="order-1 rounded-3xl border border-primary/20 bg-surface/90 p-3 shadow-lg shadow-primary/5 backdrop-blur-xl sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    dirtyLabels.length > 0
                      ? "bg-error/10 text-error"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <FontAwesomeIcon
                    icon={
                      isUnifiedSaving
                        ? faFloppyDisk
                        : dirtyLabels.length > 0
                          ? faPenToSquare
                          : faCircleCheck
                    }
                    className="h-5 w-5"
                  />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-on-surface">
                    <FontAwesomeIcon icon={faListCheck} className="h-4 w-4 text-primary" />
                    {locale === "ar" ? "حفظ تعديلات الملف" : "Save profile changes"}
                    <span className="rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
                      {dirtySections.length}{" "}
                      {locale === "ar"
                        ? "قسم معدل"
                        : dirtySections.length === 1
                          ? "changed section"
                          : "changed sections"}
                    </span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-on-surface-variant">
                    {isUnifiedSaving
                      ? t("profile.saving")
                      : dirtyLabels.length > 0
                        ? `${t("profile.saveTargets")}: ${dirtyLabels.join("، ")}`
                        : locale === "ar"
                          ? "لا توجد تغييرات غير محفوظة في التبويب الحالي أو باقي التبويبات."
                          : "There are no unsaved changes in the current tab or other tabs."}
                  </p>
                  {saveError ? (
                    <p className="mt-2 inline-flex items-center gap-2 rounded-xl bg-error/10 px-3 py-1.5 text-xs font-semibold text-error">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="h-4 w-4" />
                      {saveError}
                    </p>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                className="h-11 shrink-0 gap-2 rounded-2xl px-5 font-bold shadow-md shadow-primary/15"
                onClick={() => void saveProfileChanges()}
                disabled={
                  isUnifiedSaving || isSaveBlocked || dirtySections.length === 0
                }
              >
                {isUnifiedSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
                )}
                {isUnifiedSaving ? t("profile.saving") : t("profile.save")}
              </Button>
            </div>
            </div>
          ) : null}

          <Card className="order-3 overflow-hidden rounded-3xl border border-outline-variant/50 bg-surface/95 shadow-xl shadow-primary/5">
            <CardContent className="p-0">
              <div className="relative">
                <div
                  data-snapshot-scroll
                  data-snapshot-id="profile-edit-carousel-scroll"
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
                    className="min-w-full snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame
                      icon={faUserCircle}
                      title={t("onboarding.contactInfo.primaryContact")}
                      status={sectionStatuses.registration}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.registration}
                    >
                      <ProfileRegistrationInfoCard
                        ref={registrationRef}
                        showSaveButton={false}
                        onStatusChange={handleRegistrationStatus}
                      />
                    </ProfileEditSectionFrame>
                  </div>
                  <div
                    ref={(node) => {
                      panelRefs.current.specialties = node;
                    }}
                    id={PROFILE_SECTION_IDS.specialties}
                    role="region"
                    aria-hidden={activeTab !== "specialties"}
                    inert={activeTab !== "specialties"}
                    className="min-w-full snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame
                      icon={faStar}
                      title={t("onboarding.storeIdentity.specialties")}
                      status={sectionStatuses.specialties}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.specialties}
                    >
                      <SpecialtiesCard
                        uid={session?.uid ?? ""}
                        ref={specialtiesRef}
                        showSaveButton={false}
                        onStatusChange={handleSpecialtiesStatus}
                        unlimited={superAdmin}
                      />
                    </ProfileEditSectionFrame>
                  </div>
                  <div
                    ref={(node) => {
                      panelRefs.current.products = node;
                    }}
                    id={PROFILE_SECTION_IDS.products}
                    role="region"
                    aria-hidden={activeTab !== "products"}
                    inert={activeTab !== "products"}
                    className="min-w-full snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame
                      icon={faTags}
                      title={t("onboarding.storeIdentity.products")}
                      status={sectionStatuses.products}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.products}
                    >
                      <ProductsCard
                        uid={session?.uid ?? ""}
                        ref={productsRef}
                        showSaveButton={false}
                        onStatusChange={handleProductsStatus}
                      />
                    </ProfileEditSectionFrame>
                  </div>
                  <div
                    ref={(node) => {
                      panelRefs.current.contact = node;
                    }}
                    id={PROFILE_SECTION_IDS.contact}
                    role="region"
                    aria-hidden={activeTab !== "contact"}
                    inert={activeTab !== "contact"}
                    className="min-w-full snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame
                      icon={faComments}
                      title={t("onboarding.contactInfo.additionalContact")}
                      status={sectionStatuses.contact}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.contact}
                      hideHeader
                    >
                      <ProfileContactsCard
                        ref={contactsRef}
                        showSaveButton={false}
                        onStatusChange={handleContactStatus}
                      />
                    </ProfileEditSectionFrame>
                  </div>
                  <div
                    ref={(node) => {
                      panelRefs.current.store = node;
                    }}
                    id={PROFILE_SECTION_IDS.store}
                    role="region"
                    aria-hidden={activeTab !== "store"}
                    inert={activeTab !== "store"}
                    className="min-w-full snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame
                      icon={faBuilding}
                      title={t("onboarding.storeIdentity.title")}
                      status={sectionStatuses.store}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.store}
                    >
                      <StoreIdentityCard
                        ref={storeRef}
                        showSaveButton={false}
                        onStatusChange={handleStoreStatus}
                      />
                    </ProfileEditSectionFrame>
                  </div>
                  <div
                    ref={(node) => {
                      panelRefs.current.workingHours = node;
                    }}
                    id={PROFILE_SECTION_IDS.workingHours}
                    role="region"
                    aria-hidden={activeTab !== "workingHours"}
                    inert={activeTab !== "workingHours"}
                    className="min-w-full snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame
                      icon={faClock}
                      title={locale === "ar" ? "مواعيد العمل" : "Working hours"}
                      status={sectionStatuses.workingHours}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.workingHours}
                    >
                      <WorkingHoursProfileCard
                        ref={workingHoursRef}
                        onStatusChange={handleWorkingHoursStatus}
                      />
                    </ProfileEditSectionFrame>
                  </div>
                  <div
                    ref={(node) => {
                      panelRefs.current.fulfillment = node;
                    }}
                    id={PROFILE_SECTION_IDS.fulfillment}
                    role="region"
                    aria-hidden={activeTab !== "fulfillment"}
                    inert={activeTab !== "fulfillment"}
                    className="min-w-full snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame
                      icon={faTruckFast}
                      title={locale === "ar" ? "الشحن والإرجاع" : "Shipping"}
                      status={sectionStatuses.fulfillment}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.fulfillment}
                    >
                      <FulfillmentSettingsCard
                        ref={fulfillmentRef}
                        onStatusChange={handleFulfillmentStatus}
                      />
                    </ProfileEditSectionFrame>
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

              {/* Save Result Dialog */}
              {saveDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-surface rounded-xl shadow-xl max-w-sm w-full p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {saveDialog.type === "success" ? (
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-success"
                          >
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
                          {saveDialog.type === "success"
                            ? locale === "ar"
                              ? "نجاح"
                              : "Success"
                            : locale === "ar"
                              ? "خطأ"
                              : "Error"}
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
                        {locale === "ar" ? "إغلاق" : "Close"}
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

function ProfileEditSectionFrame({
  children,
  icon,
  title,
  status,
  locale,
  color,
  hideHeader = false,
}: {
  children: React.ReactNode;
  icon: IconDefinition;
  title: string;
  status: ProfileSectionStatus | null | undefined;
  locale: string;
  color: string;
  hideHeader?: boolean;
}) {
  const isDirty = Boolean(status?.isDirty);
  const isSaving = Boolean(status?.isSaving);
  const canSave = status?.canSave !== false;
  const statusText = isSaving
    ? locale === "ar"
      ? "جاري الحفظ"
      : "Saving"
    : isDirty
      ? canSave
        ? locale === "ar"
          ? "غير محفوظ"
          : "Unsaved"
        : locale === "ar"
          ? "يحتاج مراجعة"
          : "Needs review"
      : locale === "ar"
        ? "مستقر"
        : "Stable";

  return (
    <section
      className="rounded-3xl border bg-surface/90 p-3 shadow-lg shadow-primary/5 sm:p-4"
      style={{ borderColor: `${color}44` }}
    >
      {!hideHeader ? (
      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-3 py-3"
        style={{ backgroundColor: `${color}10` }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${color}18`, color }}
          >
            <FontAwesomeIcon icon={icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-on-surface">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {locale === "ar"
                ? "تابع تعديلات هذا القسم واحفظها من شريط الحفظ."
                : "Review this section and save it from the save bar."}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
            isSaving
              ? "bg-primary/10 text-primary"
              : isDirty
                ? canSave
                  ? "bg-error/10 text-error"
                  : "bg-error-container text-on-error-container"
                : "bg-primary/10 text-primary"
          }`}
        >
          <FontAwesomeIcon
            icon={isDirty ? faPenToSquare : faCircleCheck}
            className="h-3.5 w-3.5"
          />
          {statusText}
        </span>
      </div>
      ) : null}
      <div className="[&_.auth-input]:shadow-sm [&_button]:transition-all">
        {children}
      </div>
    </section>
  );
}
