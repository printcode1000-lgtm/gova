"use client";

import { useSessionRuntime } from "@/shared/session-runtime";
import { isSuperAdminSession } from "@asol/auth-core";
import { usePageSnapshot } from "@/features/page-snapshot";
import { useProfilePublicContacts } from "@/features/profile/presentation/hooks/use-profile-public-contacts";
import { useProfilePublicFulfillmentSettings } from "@/features/profile/presentation/hooks/use-profile-public-fulfillment-settings";
import { useProfileStoreImages } from "@/features/profile/presentation/hooks/use-profile-store-images";
import { useStoreDetails } from "@/features/profile/presentation/hooks/use-store-details";
import {
type SellerDiscountsController
} from "@/features/seller-discounts/ui";
import type { PublicProfileShareRecord } from "@/features/sharing";
import { useTranslation } from "@/shared/i18n";
import {
LogIn
} from "lucide-react";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import * as React from "react";
import type {
ProfileEditTab,
ProfileSectionStatus,
} from "../profile-page.types";
import { PROFILE_EDIT_SNAPSHOT_SCROLL_IDS } from "../profile-page.types";
import type {
ProfileContactsController,
ProfileFulfillmentController,
ProfileRegistrationController,
ProfileSpecialtiesController,
StoreDetailsController,
} from "../profile-save-controller";
import { useProfileNavigation } from "../use-profile-navigation";
import { useProfileSave } from "../use-profile-save";
import { usePageSaveRegistration } from "@/features/page-save/ui";
import { usePageSaveOperations } from "@/features/page-save/ui";
import { buildPageSaveOperationDescription } from "@/features/page-save";
import { useProfileShowcaseModel } from "./ProfilePageContent.showcase-model";

export function useProfilePageContentModel({
  initialPublicProfile = null,
}: {
  initialPublicProfile?: PublicProfileShareRecord | null;
} = {}){
const { t, locale } = useTranslation();

const router = useRouter();

const { session, isLoggedIn, isLoading, setSession } = useSessionRuntime();

const superAdmin = isSuperAdminSession(session);

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
    animateCarouselHeight,
    carouselRef,
    tabsScrollRef,
    panelRefs,
    navButtonRefs,
    activeSectionIndex,
    handleCarouselScroll,
    selectSection,
    resyncScrollToActiveTab,
    goToAdjacentSection,
  } = useProfileNavigation({
    showEditCard,
    isLoading,
    isLoggedIn,
    userId: session?.uid,
  });

const {
    sectionStatuses,
    saveError,
    isUnifiedSaving,
    
    handleRegistrationStatus,
    handleSpecialtiesStatus,
    handleProductsStatus,
    handleContactStatus,
    handleStoreStatus,
    handleWorkingHoursStatus,
    handleFulfillmentStatus,
    handleDiscountsStatus,
    handleSaveChangedSections,
    
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

const {
    featuredProducts,
    setFeaturedProducts,
    isLoadingFeaturedProducts,
    setIsLoadingFeaturedProducts,
    heroSliderConfig,
    profileFeaturedConfig,
    profileTrendingConfig,
  } = useProfileShowcaseModel({
    storeImages,
    storeDetails,
    showPreviewCard,
    previewUid,
    onProductAction: React.useCallback(
      (action) => router.push(`/product?${action}`),
      [router],
    ),
  });

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
          if (
            PROFILE_EDIT_SNAPSHOT_SCROLL_IDS.some((id) =>
              selector.includes(id),
            )
          ) {
            continue;
          }
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
        resyncScrollToActiveTab();
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
  }, [editSnapshotReady, resyncScrollToActiveTab, restoreEditSnapshot]);

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
    (sectionsFilter?: ProfileEditTab[]) =>
      handleSaveChangedSections(
        registrationRef.current,
        contactsRef.current,
        storeRef.current,
        workingHoursRef.current,
        specialtiesRef.current,
        productsRef.current,
        fulfillmentRef.current,
        discountsRef.current,
        sectionsFilter,
      ),
    [handleSaveChangedSections],
  );

const profileOperations = usePageSaveOperations("profile-edit");

const pageSaveItems = React.useMemo(
  () => [
    ...dirtySections.map(([section, status]) => ({
      id: section,
      label: status?.label ?? section,
      description:
        status?.description ?? buildPageSaveOperationDescription(t, ["save"]),
      isDirty: true,
      canSave: status?.canSave ?? true,
    })),
    ...profileOperations.items,
  ],
  [dirtySections, profileOperations.items, t],
);

usePageSaveRegistration({
  id: "profile-edit",
  label: locale === "ar" ? "الملف الشخصي" : "Profile",
  returnPath: "/profile?mode=edit",
  enabled: showEditCard,
  items: pageSaveItems,
  isSaving: isUnifiedSaving,
  canSave:
    !isSaveBlocked &&
    (dirtySections.length > 0 || profileOperations.items.length > 0),
  prepareForSave: async (selectedItemIds) => {
    if (
      selectedItemIds.includes("store") &&
      storeRef.current?.prepareForSave &&
      !(await storeRef.current.prepareForSave())
    ) {
      return false;
    }
    return true;
  },
  save: async (selectedItemIds) => {
    const operationIds = profileOperations.items
      .map((item) => item.id)
      .filter((id) => selectedItemIds.includes(id));
    const sectionIds = selectedItemIds.filter(
      (id) => !operationIds.includes(id),
    );
    const operationsSaved = await profileOperations.run(operationIds);
    const sectionsSaved =
      sectionIds.length === 0
        ? true
        : await saveProfileChanges(sectionIds as ProfileEditTab[]);
    return operationsSaved && sectionsSaved !== false;
  },
});

const earlyView = isLoading ? (
      <div id="profile.profile-page.profile-page-content.model.div" className="container px-4 py-8 text-sm text-on-surface-variant">
        {t("profile.loading")}
      </div>
    ) : !isLoggedIn && !isViewingOtherProfile ? (
      <div id="profile.profile-page.profile-page-content.model.div.2" className="container px-4 py-8 max-w-lg mx-auto text-center space-y-4">
        <p id="profile.profile-page.profile-page-content.model.p" className="text-on-surface-variant">{t("profile.loginRequired")}</p>
        <Link id="profile.profile-page.profile-page-content.model.link"
          href="/login"
          className="inline-flex items-center gap-2 auth-cta px-6 h-11"
        >
          <LogIn id="profile.profile-page.profile-page-content.model.log-in" className="h-4 w-4" />
          {t("sidebar.login")}
        </Link>
      </div>
    ) : null;

return { initialPublicProfile, t, locale, router, session, isLoggedIn, isLoading, setSession, superAdmin, searchParams, mode, uid, isViewingOtherProfile, showEditCard, showPreviewCard, matchingInitialProfile, storeImages, isLoadingStoreImages, storeDetails, isLoadingStoreDetails, previewUid, isPreviewOwner, previewContacts, isLoadingPreviewContacts, previewFulfillment, isLoadingPreviewFulfillment, registrationRef, specialtiesRef, productsRef, contactsRef, storeRef, workingHoursRef, fulfillmentRef, discountsRef, activeTab, carouselHeight, animateCarouselHeight, carouselRef, tabsScrollRef, panelRefs, navButtonRefs, activeSectionIndex, handleCarouselScroll, selectSection, resyncScrollToActiveTab, goToAdjacentSection, sectionStatuses, saveError, isUnifiedSaving,  handleRegistrationStatus, handleSpecialtiesStatus, handleProductsStatus, handleContactStatus, handleStoreStatus, handleWorkingHoursStatus, handleFulfillmentStatus, handleDiscountsStatus, handleSaveChangedSections,  editSnapshotReady, restoreEditSnapshot, restoredEditSnapshotRef, featuredProducts, setFeaturedProducts, isLoadingFeaturedProducts, setIsLoadingFeaturedProducts, heroSliderConfig, profileFeaturedConfig, profileTrendingConfig, dirtySections, dirtyLabels, isSaveBlocked, saveProfileChanges, earlyView };
}


export type ProfilePageContentModel = ReturnType<typeof useProfilePageContentModel>;
