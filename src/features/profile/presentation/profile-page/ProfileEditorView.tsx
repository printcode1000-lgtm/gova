"use client";

import type { ProfilePageContentModel } from "./ProfilePageContent.model";

import { ProfileEditWorkspaceView } from "./ProfileEditWorkspaceView";

import { HiddenProfileEditorView } from "./HiddenProfileEditorView";

export function ProfileEditorView({ model }: { model: ProfilePageContentModel }){
const { initialPublicProfile, t, locale, router, session, isLoggedIn, isLoading, setSession, superAdmin, searchParams, mode, uid, isViewingOtherProfile, showEditCard, showPreviewCard, matchingInitialProfile, storeImages, isLoadingStoreImages, storeDetails, isLoadingStoreDetails, previewUid, isPreviewOwner, previewContacts, isLoadingPreviewContacts, previewFulfillment, isLoadingPreviewFulfillment, registrationRef, specialtiesRef, productsRef, contactsRef, storeRef, workingHoursRef, fulfillmentRef, discountsRef, activeTab, carouselHeight, carouselRef, panelRefs, navButtonRefs, activeSectionIndex, handleCarouselScroll, selectSection, goToAdjacentSection, sectionStatuses, saveError, isUnifiedSaving,  handleRegistrationStatus, handleSpecialtiesStatus, handleProductsStatus, handleContactStatus, handleStoreStatus, handleWorkingHoursStatus, handleFulfillmentStatus, handleDiscountsStatus, handleSaveChangedSections,  editSnapshotReady, restoreEditSnapshot, restoredEditSnapshotRef, featuredProducts, setFeaturedProducts, isLoadingFeaturedProducts, setIsLoadingFeaturedProducts, heroSliderConfig, profileFeaturedConfig, profileTrendingConfig, dirtySections, dirtyLabels, isSaveBlocked, saveProfileChanges, earlyView } = model;
return showEditCard ? <ProfileEditWorkspaceView model={model} /> : <HiddenProfileEditorView model={model} />;
}
