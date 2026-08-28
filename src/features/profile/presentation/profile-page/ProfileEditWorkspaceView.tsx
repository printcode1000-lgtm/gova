"use client";

import { FulfillmentSettingsCard } from "@/features/profile/presentation/FulfillmentSettingsCard";
import { ProductsCard } from "@/features/profile/presentation/ProductsCard";
import { ProfileContactsCard } from "@/features/profile/presentation/ProfileContactsCard";
import { ProfileRegistrationInfoCard } from "@/features/profile/presentation/ProfileRegistrationInfoCard";
import { SpecialtiesCard } from "@/features/profile/presentation/SpecialtiesCard";
import { StoreIdentityCard } from "@/features/profile/presentation/StoreIdentityCard";
import { WorkingHoursProfileCard } from "@/features/profile/presentation/WorkingHoursProfileCard";
import { Card,CardContent } from "@/shared/ui/card";
import {
SellerDiscountsManager
} from "@/features/seller-discounts/ui";
import {
faBuilding,
faClock,
faComments,
faPercent,
faStar,
faTags,
faTruckFast,
faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import { PROFILE_SECTION_IDS } from "../profile-page.types";
import type { ProfilePageContentModel } from "./ProfilePageContent.model";
import { PROFILE_EDIT_TAB_COLORS,ProfileEditSectionFrame } from "./ProfilePageContent.profile-tabs";
import {
  ProfileEditCarouselControls,
  ProfileEditSaveFeedback,
  ProfileEditTabsBar,
} from "./ProfileEditWorkspaceChrome";

export function ProfileEditWorkspaceView({ model }: { model: ProfilePageContentModel }) {
const { t, locale, session, superAdmin, registrationRef, specialtiesRef, productsRef, contactsRef, storeRef, workingHoursRef, fulfillmentRef, discountsRef, activeTab, carouselHeight, animateCarouselHeight, carouselRef, panelRefs, handleCarouselScroll, sectionStatuses, saveError, handleRegistrationStatus, handleSpecialtiesStatus, handleProductsStatus, handleContactStatus, handleStoreStatus, handleWorkingHoursStatus, handleFulfillmentStatus, handleDiscountsStatus } = model;
return (
        <div
          id="edit-profile-card"
          className="mx-auto flex w-full max-w-4xl flex-col gap-3 pt-1 sm:gap-4 sm:pt-2"
        >
          <ProfileEditTabsBar id="profile.profile-page.profile-edit-workspace-view.profile-edit-tabs-bar" model={model} />

          <ProfileEditSaveFeedback id="profile.profile-page.profile-edit-workspace-view.profile-edit-save-feedback" model={model} />

          <Card id="profile.profile-page.profile-edit-workspace-view.card" className="order-3 w-full max-w-full overflow-hidden rounded-3xl border border-outline-variant/50 bg-surface/95 shadow-xl shadow-primary/5">
            <CardContent id="profile.profile-page.profile-edit-workspace-view.card-content" className="p-0">
              <div id="profile.profile-page.profile-edit-workspace-view.div" className="relative">
                <div id="profile.profile-page.profile-edit-workspace-view.div.2"
                  data-snapshot-id="profile-edit-carousel-scroll"
                  ref={carouselRef}
                  onScroll={handleCarouselScroll}
                  style={{
                    ...(carouselHeight ? { height: carouselHeight } : null),
                    transitionDuration: animateCarouselHeight ? "300ms" : "0ms",
                  }}
                  className="flex snap-x snap-mandatory scroll-smooth items-start overflow-x-auto overflow-y-hidden overscroll-x-contain transition-[height] ease-out [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <div
                    ref={(node) => {
                      panelRefs.current.registration = node;
                    }}
                    id={PROFILE_SECTION_IDS.registration}
                    role="region"
                    aria-hidden={activeTab !== "registration"}
                    inert={activeTab !== "registration"}
                    className="w-full max-w-full shrink-0 snap-center snap-always bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame id="profile.profile-page.profile-edit-workspace-view.profile-edit-section-frame"
                      icon={faUserCircle}
                      title={t("onboarding.contactInfo.primaryContact")}
                      status={sectionStatuses.registration}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.registration}
                    >
                      <ProfileRegistrationInfoCard
                        ref={registrationRef}
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
                    className="w-full max-w-full shrink-0 snap-center snap-always bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame id="profile.profile-page.profile-edit-workspace-view.profile-edit-section-frame.2"
                      icon={faStar}
                      title={t("onboarding.storeIdentity.specialties")}
                      status={sectionStatuses.specialties}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.specialties}
                    >
                      <SpecialtiesCard
                        uid={session?.uid ?? ""}
                        ref={specialtiesRef}
                        onStatusChange={handleSpecialtiesStatus}
                        unlimited={superAdmin}
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
                    className="w-full max-w-full shrink-0 snap-center snap-always bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame id="profile.profile-page.profile-edit-workspace-view.profile-edit-section-frame.3"
                      icon={faBuilding}
                      title={t("onboarding.storeIdentity.title")}
                      status={sectionStatuses.store}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.store}
                    >
                      <StoreIdentityCard
                        ref={storeRef}
                        onStatusChange={handleStoreStatus}
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
                    className="w-full max-w-full shrink-0 snap-center snap-always bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame id="profile.profile-page.profile-edit-workspace-view.profile-edit-section-frame.4"
                      icon={faTags}
                      title={t("onboarding.storeIdentity.products")}
                      status={sectionStatuses.products}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.products}
                    >
                      <ProductsCard
                        uid={session?.uid ?? ""}
                        ref={productsRef}
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
                    className="w-full max-w-full shrink-0 snap-center snap-always bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame id="profile.profile-page.profile-edit-workspace-view.profile-edit-section-frame.5"
                      icon={faComments}
                      title={t("onboarding.contactInfo.additionalContact")}
                      status={sectionStatuses.contact}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.contact}
                      hideHeader
                    >
                      <ProfileContactsCard
                        ref={contactsRef}
                        onStatusChange={handleContactStatus}
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
                    className="w-full max-w-full shrink-0 snap-center snap-always bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame id="profile.profile-page.profile-edit-workspace-view.profile-edit-section-frame.6"
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
                    className="w-full max-w-full shrink-0 snap-center snap-always bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame id="profile.profile-page.profile-edit-workspace-view.profile-edit-section-frame.7"
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
                  <div
                    ref={(node) => {
                      panelRefs.current.discounts = node;
                    }}
                    id={PROFILE_SECTION_IDS.discounts}
                    role="region"
                    aria-hidden={activeTab !== "discounts"}
                    inert={activeTab !== "discounts"}
                    className="w-full max-w-full shrink-0 snap-center snap-always bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame id="profile.profile-page.profile-edit-workspace-view.profile-edit-section-frame.8"
                      icon={faPercent}
                      title={locale === "ar" ? "العروض والخصومات" : "Offers"}
                      status={sectionStatuses.discounts}
                      locale={locale}
                      color={PROFILE_EDIT_TAB_COLORS.discounts}
                    >
                      <SellerDiscountsManager
                        ref={discountsRef}
                        sellerUid={session?.uid ?? ""}
                        locale={locale === "ar" ? "ar" : "en"}
                        onStatusChange={handleDiscountsStatus}
                      />
                    </ProfileEditSectionFrame>
                  </div>
                </div>
              </div>

              <ProfileEditCarouselControls id="profile.profile-page.profile-edit-workspace-view.profile-edit-carousel-controls" model={model} />

              {saveError ? (
                <div id="profile.profile-page.profile-edit-workspace-view.div.3" className="mx-3 mb-3 rounded-lg bg-error/15 px-3 py-2 text-sm text-error sm:mx-5">
                  {saveError}
                </div>
              ) : null}

            </CardContent>
          </Card>
        </div>
      );
}
