"use client";

import { FulfillmentSettingsCard } from "@/components/profile/FulfillmentSettingsCard";
import { ProductsCard } from "@/components/profile/ProductsCard";
import { ProfileContactsCard } from "@/components/profile/ProfileContactsCard";
import { ProfileRegistrationInfoCard } from "@/components/profile/ProfileRegistrationInfoCard";
import { SpecialtiesCard } from "@/components/profile/SpecialtiesCard";
import { StoreIdentityCard } from "@/components/profile/StoreIdentityCard";
import { WorkingHoursProfileCard } from "@/components/profile/WorkingHoursProfileCard";
import { Button } from "@/components/ui/button";
import { Card,CardContent } from "@/components/ui/card";
import {
SellerDiscountsManager
} from "@/features/seller-discounts";
import {
faBuilding,
faCircleCheck,
faClock,
faComments,
faFloppyDisk,
faListCheck,
faPenToSquare,
faPercent,
faStar,
faTags,
faTriangleExclamation,
faTruckFast,
faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
ChevronLeft,
ChevronRight,
Loader2
} from "lucide-react";
import type {
ProfileEditTab
} from "../profile-page.types";
import { PROFILE_SECTION_IDS,PROFILE_SECTIONS } from "../profile-page.types";
import type { ProfilePageContentModel } from "./ProfilePageContent.model";
import { PROFILE_EDIT_TAB_COLORS,PROFILE_EDIT_TAB_ICONS,ProfileEditSectionFrame } from "./ProfilePageContent.profile-tabs";
import { ProfileSaveDialog } from "./ProfileSaveDialog";

export function ProfileEditWorkspaceView({ model }: { model: ProfilePageContentModel }) {
const { initialPublicProfile, t, locale, router, session, isLoggedIn, isLoading, setSession, superAdmin, searchParams, mode, uid, isViewingOtherProfile, showEditCard, showPreviewCard, matchingInitialProfile, storeImages, isLoadingStoreImages, storeDetails, isLoadingStoreDetails, previewUid, isPreviewOwner, previewContacts, isLoadingPreviewContacts, previewFulfillment, isLoadingPreviewFulfillment, registrationRef, specialtiesRef, productsRef, contactsRef, storeRef, workingHoursRef, fulfillmentRef, discountsRef, activeTab, carouselHeight, carouselRef, panelRefs, navButtonRefs, activeSectionIndex, handleCarouselScroll, selectSection, goToAdjacentSection, sectionStatuses, saveError, isUnifiedSaving, saveDialog, handleRegistrationStatus, handleSpecialtiesStatus, handleProductsStatus, handleContactStatus, handleStoreStatus, handleWorkingHoursStatus, handleFulfillmentStatus, handleDiscountsStatus, handleSaveChangedSections, setSaveDialog, editSnapshotReady, restoreEditSnapshot, restoredEditSnapshotRef, featuredProducts, setFeaturedProducts, isLoadingFeaturedProducts, setIsLoadingFeaturedProducts, heroSliderConfig, profileFeaturedConfig, profileTrendingConfig, submitProfileCustomRequest, dirtySections, dirtyLabels, isSaveBlocked, saveProfileChanges, earlyView } = model;
return (
        <div
          id="edit-profile-card"
          className="mx-auto flex w-full max-w-4xl flex-col gap-3 pt-1 sm:gap-4 sm:pt-2"
        >
          <div className="order-2 w-full max-w-full overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-low/85 shadow-sm backdrop-blur-xl">
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
                  workingHours:
                    locale === "ar" ? "مواعيد العمل" : "Working hours",
                  fulfillment: locale === "ar" ? "الشحن والإرجاع" : "Shipping",
                  discounts: locale === "ar" ? "العروض" : "Offers",
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
            <div className="order-1 w-full max-w-full overflow-hidden rounded-3xl border border-primary/20 bg-surface/90 p-3 shadow-lg shadow-primary/5 backdrop-blur-xl sm:p-4">
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
                      <FontAwesomeIcon
                        icon={faListCheck}
                        className="h-4 w-4 text-primary"
                      />
                      {locale === "ar"
                        ? "حفظ تعديلات الملف"
                        : "Save profile changes"}
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
                        <FontAwesomeIcon
                          icon={faTriangleExclamation}
                          className="h-4 w-4"
                        />
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
                    isUnifiedSaving ||
                    isSaveBlocked ||
                    dirtySections.length === 0
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

          <Card className="order-3 w-full max-w-full overflow-hidden rounded-3xl border border-outline-variant/50 bg-surface/95 shadow-xl shadow-primary/5">
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
                    className="w-full max-w-full shrink-0 snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
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
                    className="w-full max-w-full shrink-0 snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
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
                    className="w-full max-w-full shrink-0 snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
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
                    className="w-full max-w-full shrink-0 snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
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
                    className="w-full max-w-full shrink-0 snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
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
                    className="w-full max-w-full shrink-0 snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
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
                    className="w-full max-w-full shrink-0 snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
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
                  <div
                    ref={(node) => {
                      panelRefs.current.discounts = node;
                    }}
                    id={PROFILE_SECTION_IDS.discounts}
                    role="region"
                    aria-hidden={activeTab !== "discounts"}
                    inert={activeTab !== "discounts"}
                    className="w-full max-w-full shrink-0 snap-center bg-gradient-to-b from-surface-container-low/40 to-surface p-3 sm:p-5 lg:p-6"
                  >
                    <ProfileEditSectionFrame
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

              <ProfileSaveDialog model={model} />
            </CardContent>
          </Card>
        </div>
      );
}
