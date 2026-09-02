"use client";

import { ProfilePreviewContent } from "../ProfilePreviewContent";
import type { ProfilePageContentModel } from "./ProfilePageContent.model";

export function ProfilePreviewView({ model }: { model: ProfilePageContentModel }) {
const { initialPublicProfile, t, locale, router, session, isLoggedIn, isLoading, setSession, superAdmin, searchParams, mode, uid, isViewingOtherProfile, showEditCard, showPreviewCard, matchingInitialProfile, storeImages, isLoadingStoreImages, storeDetails, isLoadingStoreDetails, previewUid, isPreviewOwner, previewContacts, isLoadingPreviewContacts, previewFulfillment, isLoadingPreviewFulfillment, registrationRef, specialtiesRef, productsRef, contactsRef, storeRef, workingHoursRef, fulfillmentRef, discountsRef, activeTab, carouselHeight, carouselRef, panelRefs, navButtonRefs, activeSectionIndex, handleCarouselScroll, selectSection, goToAdjacentSection, sectionStatuses, saveError, isUnifiedSaving,  handleRegistrationStatus, handleSpecialtiesStatus, handleProductsStatus, handleContactStatus, handleStoreStatus, handleWorkingHoursStatus, handleFulfillmentStatus, handleDiscountsStatus, handleSaveChangedSections,  editSnapshotReady, restoreEditSnapshot, restoredEditSnapshotRef, featuredProducts, setFeaturedProducts, isLoadingFeaturedProducts, setIsLoadingFeaturedProducts, heroSliderConfig, profileFeaturedConfig, profileTrendingConfig, dirtySections, dirtyLabels, isSaveBlocked, saveProfileChanges, earlyView } = model;
return (
        <div id='profile-presentation-profile-page-profilepreviewview-div-1-zveolj' className="pt-0.5 sm:pt-1">
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
          />
        </div>
      );
}
