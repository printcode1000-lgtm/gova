"use client";

import type { ProfilePageContentModel } from "./ProfilePageContent.model";

import { ProfilePreviewView } from "./ProfilePreviewView";

import { ProfileEditorView } from "./ProfileEditorView";
import { uiAttributes } from "@asol/ui-registry-core";

export function ProfilePageContentView({ id, model }: { model: ProfilePageContentModel; id?: string }){
const { initialPublicProfile, t, locale, router, session, isLoggedIn, isLoading, setSession, superAdmin, searchParams, mode, uid, isViewingOtherProfile, showEditCard, showPreviewCard, matchingInitialProfile, storeImages, isLoadingStoreImages, storeDetails, isLoadingStoreDetails, previewUid, isPreviewOwner, previewContacts, isLoadingPreviewContacts, previewFulfillment, isLoadingPreviewFulfillment, registrationRef, specialtiesRef, productsRef, contactsRef, storeRef, workingHoursRef, fulfillmentRef, discountsRef, activeTab, carouselHeight, carouselRef, panelRefs, navButtonRefs, activeSectionIndex, handleCarouselScroll, selectSection, goToAdjacentSection, sectionStatuses, saveError, isUnifiedSaving,  handleRegistrationStatus, handleSpecialtiesStatus, handleProductsStatus, handleContactStatus, handleStoreStatus, handleWorkingHoursStatus, handleFulfillmentStatus, handleDiscountsStatus, handleSaveChangedSections,  editSnapshotReady, restoreEditSnapshot, restoredEditSnapshotRef, featuredProducts, setFeaturedProducts, isLoadingFeaturedProducts, setIsLoadingFeaturedProducts, heroSliderConfig, profileFeaturedConfig, profileTrendingConfig, dirtySections, dirtyLabels, isSaveBlocked, saveProfileChanges, earlyView } = model;
return (
  <div {...uiAttributes({ uid: "profile.profile-page.profile-page-content.view.div-bI8kQP", id: "profile.profile-page.profile-page-content.view.div" })} id={id}>
    {showPreviewCard ? <ProfilePreviewView model={model} /> : <ProfileEditorView model={model} />}
  </div>
);
}
