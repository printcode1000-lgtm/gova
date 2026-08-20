"use client";

import { formatPlainMoneyMajor } from "@asol/format-core";

import type { FeaturedMarqueeConfig } from "@/components/ui/FeaturedMarquee";
import type { HeroSliderConfig } from "@/components/ui/HeroSlider";
import type { TrendingRibbonConfig } from "@/components/ui/TrendingRibbon";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { usePageSnapshot } from "@/features/page-snapshot";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import { productApiService } from "@/features/product/services/product-api-service";
import { useProfilePublicContacts } from "@/features/profile/hooks/use-profile-public-contacts";
import { useProfilePublicFulfillmentSettings } from "@/features/profile/hooks/use-profile-public-fulfillment-settings";
import { useProfileStoreImages } from "@/features/profile/hooks/use-profile-store-images";
import { useStoreDetails } from "@/features/profile/hooks/use-store-details";
import {
type SellerDiscountsController
} from "@/features/seller-discounts";
import type { PublicProfileShareRecord } from "@/features/sharing";
import { useTranslation } from "@/lib/i18n";
import {
LogIn
} from "lucide-react";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import type {
ProfileEditTab,
ProfileSectionStatus,
} from "../profile-page.types";
import type {
ProfileContactsController,
ProfileFulfillmentController,
ProfileRegistrationController,
ProfileSpecialtiesController,
StoreDetailsController,
} from "../profile-save-controller";
import { useProfileNavigation } from "../use-profile-navigation";
import { useProfileSave } from "../use-profile-save";

export function useProfilePageContentModel({
  initialPublicProfile = null,
}: {
  initialPublicProfile?: PublicProfileShareRecord | null;
} = {}){
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

const matchingInitialProfile =
    initialPublicProfile?.uid === uid ? initialPublicProfile : null;

const { storeImages, isLoading: isLoadingStoreImages } =
    useProfileStoreImages(
      isViewingOtherProfile ? uid : undefined,
      matchingInitialProfile?.storeImages,
    );

const { details: storeDetails, isLoading: isLoadingStoreDetails } =
    useStoreDetails(
      isViewingOtherProfile ? uid : undefined,
      matchingInitialProfile?.storeDetails,
    );

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

const discountsRef = React.useRef<SellerDiscountsController>(null);

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
    handleDiscountsStatus,
    handleSaveChangedSections,
    setSaveDialog,
  } = useProfileSave({
    session,
    locale,
    t,
    setActiveTab: selectSection,
    setSession,
    returnTo: searchParams.get("returnTo"),
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
              .catch((error) => {
                console.warn("[Profile] Failed to load featured product.", {
                  id,
                  error,
                });
                return null;
              }),
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
    let restoreFrame: number | null = null;
    const timers: number[] = [];
    const stopAutomaticRestore = () => {
      userInteracted = true;
    };
    const restore = async () => {
      const snapshot = await restoreEditSnapshot();
      if (!snapshot || cancelled) return;
      const restoreScroll = () => {
        if (cancelled || userInteracted) return;
        for (const [selector, position] of Object.entries(
          snapshot.scroll.elements,
        )) {
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
      const scheduleRestoreScroll = () => {
        if (restoreFrame !== null) cancelAnimationFrame(restoreFrame);
        restoreFrame = requestAnimationFrame(() => {
          restoreFrame = null;
          restoreScroll();
        });
      };

      [80, 220, 500, 900, 1600, 2600].forEach((delay) => {
        timers.push(window.setTimeout(restoreScroll, delay));
      });
      observer = new ResizeObserver(scheduleRestoreScroll);
      observer.observe(document.documentElement);
    };

    window.addEventListener("pointerdown", stopAutomaticRestore, {
      passive: true,
    });
    window.addEventListener("wheel", stopAutomaticRestore, { passive: true });
    window.addEventListener("touchstart", stopAutomaticRestore, {
      passive: true,
    });
    window.addEventListener("keydown", stopAutomaticRestore);
    void restore();

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (restoreFrame !== null) cancelAnimationFrame(restoreFrame);
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
              ? formatPlainMoneyMajor(price, "ar")
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
        discountsRef.current,
      ),
    [handleSaveChangedSections],
  );

const earlyView = isLoading ? (
      <div className="container px-4 py-8 text-sm text-on-surface-variant">
        {t("profile.loading")}
      </div>
    ) : !isLoggedIn && !isViewingOtherProfile ? (
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
    ) : null;

return { initialPublicProfile, t, locale, router, session, isLoggedIn, isLoading, setSession, superAdmin, searchParams, mode, uid, isViewingOtherProfile, showEditCard, showPreviewCard, matchingInitialProfile, storeImages, isLoadingStoreImages, storeDetails, isLoadingStoreDetails, previewUid, isPreviewOwner, previewContacts, isLoadingPreviewContacts, previewFulfillment, isLoadingPreviewFulfillment, registrationRef, specialtiesRef, productsRef, contactsRef, storeRef, workingHoursRef, fulfillmentRef, discountsRef, activeTab, carouselHeight, carouselRef, panelRefs, navButtonRefs, activeSectionIndex, handleCarouselScroll, selectSection, goToAdjacentSection, sectionStatuses, saveError, isUnifiedSaving, saveDialog, handleRegistrationStatus, handleSpecialtiesStatus, handleProductsStatus, handleContactStatus, handleStoreStatus, handleWorkingHoursStatus, handleFulfillmentStatus, handleDiscountsStatus, handleSaveChangedSections, setSaveDialog, editSnapshotReady, restoreEditSnapshot, restoredEditSnapshotRef, featuredProducts, setFeaturedProducts, isLoadingFeaturedProducts, setIsLoadingFeaturedProducts, heroSliderConfig, profileFeaturedConfig, profileTrendingConfig, dirtySections, dirtyLabels, isSaveBlocked, saveProfileChanges, earlyView };
}


export type ProfilePageContentModel = ReturnType<typeof useProfilePageContentModel>;
