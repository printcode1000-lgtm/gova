"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBookOpen,
  faBoxOpen,
  faClock,
  faComments,
  faShareNodes,
} from "@fortawesome/free-solid-svg-icons";
import { ContactActionBar } from "@/components/ui/contact-action-bar";
import {
  FeaturedMarquee,
  type FeaturedMarqueeConfig,
} from "@/components/ui/FeaturedMarquee";
import { FollowButton } from "@/components/ui/follow";
import { HeroSlider, type HeroSliderConfig } from "@/components/ui/HeroSlider";
import { ProfileCustomRequestButton } from "@/components/ui/profile-custom-request-button";
import {
  TrendingRibbon,
  type TrendingRibbonConfig,
} from "@/components/ui/TrendingRibbon";
import { WorkingHoursCard } from "@/components/ui/working-hours";
import { ProductReviews } from "@/components/product/ProductReviews";
import type { UserSession } from "@/features/auth/entities/session.entity";
import type { ProfileContactsData } from "@/features/profile/entities/profile-contacts.entity";
import type { ProfileFulfillmentSettings } from "@/features/profile/entities/profile-fulfillment-settings.entity";
import type { StoreDetailsData } from "@/features/profile/entities/store-details.entity";
import type { StoreImagesData } from "@/features/profile/entities/store-images.entity";
import { usePageSnapshot, useSnapshotState } from "@/features/page-snapshot";
import { ProfileProductsPreview } from "./ProfileProductsPreview";
import {
  ProfileFulfillmentPreviewCard,
  ProfilePreviewMetrics,
} from "./ProfilePreviewInformation";

interface ProfilePreviewContentProps {
  locale: "ar" | "en";
  previewUid: string;
  session: UserSession | null;
  isOwner: boolean;
  isSuperAdmin: boolean;
  storeImages: StoreImagesData;
  storeDetails: StoreDetailsData;
  contacts: ProfileContactsData | null;
  fulfillment: ProfileFulfillmentSettings;
  heroConfig: HeroSliderConfig;
  featuredConfig: FeaturedMarqueeConfig;
  trendingConfig: TrendingRibbonConfig;
  hasFeaturedProducts: boolean;
  loading: {
    images: boolean;
    details: boolean;
    contacts: boolean;
    fulfillment: boolean;
    featured: boolean;
  };
  onCustomRequest: (input: {
    title: string;
    description: string;
    images: { imageKey: string; url: string }[];
  }) => Promise<void>;
}

export function ProfilePreviewContent(props: ProfilePreviewContentProps) {
  const {
    locale,
    previewUid,
    session,
    storeImages,
    storeDetails,
    contacts,
    fulfillment,
    loading,
  } = props;
  const ar = locale === "ar";
  const [storyExpanded, setStoryExpanded] = useSnapshotState(
    "profile.preview.storyExpanded",
    false,
  );
  const ready =
    !loading.images &&
    !loading.details &&
    !loading.contacts &&
    !loading.fulfillment &&
    !loading.featured;
  const { restoreSnapshot } = usePageSnapshot({ restoreWhen: ready });
  const restoredRef = useRef("");

  useEffect(() => {
    if (!ready || !previewUid || restoredRef.current === previewUid) return;
    const timer = window.setTimeout(() => {
      restoredRef.current = previewUid;
      void restoreSnapshot();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [previewUid, ready, restoreSnapshot]);

  return (
    <div
      data-snapshot-id="profile-preview-root"
      className="mx-auto w-full max-w-6xl space-y-5 px-0 sm:space-y-6 sm:px-4"
    >
      <div>
        {loading.images ? (
          <div className="py-8 text-center text-sm text-on-surface-variant">
            {ar ? "جارٍ التحميل..." : "Loading..."}
          </div>
        ) : (
          <div className="mb-0">
            <HeroSlider mode="view" config={props.heroConfig} />
          </div>
        )}

        {!loading.details ? (
          <section className="mx-2 border-b border-outline-variant/60 pb-4 sm:mx-4 sm:pb-5">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              {storeImages.avatarUrl ? (
                <div className="relative z-10 -mt-8 h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-4 border-surface shadow-lg sm:-mt-10 sm:h-28 sm:w-28">
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
                  <h1 className="break-words text-lg font-bold leading-7 text-on-surface sm:text-2xl">
                    {storeDetails.storeName}
                  </h1>
                ) : null}
                {storeDetails.storeDescription ? (
                  <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-on-surface-variant sm:text-sm sm:leading-6">
                    {storeDetails.storeDescription}
                  </p>
                ) : null}
                {previewUid ? (
                  <div className="mt-3">
                    <FollowButton
                      targetType="store"
                      targetId={previewUid}
                      targetOwnerUid={previewUid}
                      viewerUid={session?.uid}
                      isOwner={props.isOwner}
                      isSuperAdmin={props.isSuperAdmin}
                      targetLabel={
                        storeDetails.storeName ||
                        (ar ? "مقدم الخدمة" : "Provider")
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {!loading.contacts && contacts ? (
        <section className="grid gap-3 rounded-3xl border border-outline-variant/70 bg-surface p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center sm:p-5">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <FontAwesomeIcon icon={faShareNodes} className="text-primary" />
              {ar ? "تواصل سريع" : "Quick contact"}
            </h2>
            <ContactActionBar
              data={contacts}
              compact
              className="border-0 bg-transparent p-0 shadow-none"
            />
          </div>
          {storeDetails.profileShowcase?.customRequestEnabled &&
          session?.uid &&
          previewUid ? (
            <ProfileCustomRequestButton
              onSubmit={props.onCustomRequest}
              buttonLabel={ar ? "إرسال طلب خاص" : "Send custom request"}
              title={`${ar ? "طلب خاص إلى" : "Custom request to"} ${storeDetails.storeName || (ar ? "البائع" : "seller")}`}
            />
          ) : null}
        </section>
      ) : null}

      {!loading.details && !loading.fulfillment ? (
        <ProfilePreviewMetrics
          locale={locale}
          details={storeDetails}
          fulfillment={fulfillment}
        />
      ) : null}

      {!loading.featured && props.hasFeaturedProducts ? (
        <section className="mx-2 sm:mx-4">
          <FeaturedMarquee config={props.featuredConfig} />
        </section>
      ) : null}

      {props.trendingConfig.items.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-error/20 shadow-sm">
          <TrendingRibbon config={props.trendingConfig} />
        </section>
      ) : null}

      {previewUid ? (
        <section className="rounded-3xl border border-outline-variant/70 bg-surface p-3 shadow-sm sm:p-6">
          <SectionHeading
            icon={faBoxOpen}
            title={ar ? "المنتجات والخدمات" : "Products & services"}
            hint={
              ar ? "تظهر المنتجات النشطة فقط" : "Only active products are shown"
            }
          />
          <ProfileProductsPreview uid={previewUid} />
        </section>
      ) : null}

      {!loading.details && !loading.fulfillment ? (
        <section className="grid items-stretch gap-5 lg:grid-cols-2">
          <div className="h-full rounded-3xl border border-outline-variant/70 bg-surface p-4 shadow-sm sm:p-6">
            <SectionHeading
              icon={faClock}
              title={ar ? "مواعيد العمل" : "Working hours"}
              hint={
                ar
                  ? "أوقات استقبال الطلبات والتواصل"
                  : "Availability for orders and contact"
              }
            />
            <WorkingHoursCard
              mode="preview"
              locale={locale}
              value={storeDetails.workingHours}
            />
          </div>
          <ProfileFulfillmentPreviewCard
            locale={locale}
            fulfillment={fulfillment}
          />
        </section>
      ) : null}

      {!loading.details && storeDetails.storeStory ? (
        <section
          data-snapshot-expanded="profile-preview-story"
          aria-expanded={storyExpanded}
          className="rounded-3xl border border-outline-variant/70 bg-gradient-to-br from-primary/5 to-secondary/5 p-5 shadow-sm sm:p-7"
        >
          <button
            type="button"
            onClick={() => setStoryExpanded((current) => !current)}
            className="flex w-full items-center gap-3 text-start"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary">
              <FontAwesomeIcon icon={faBookOpen} />
            </span>
            <span className="flex-1">
              <strong className="block text-lg">
                {ar ? "قصة المتجر" : "Store story"}
              </strong>
              <span className="text-xs text-on-surface-variant">
                {ar
                  ? "تعرف على قصة وهوية النشاط"
                  : "Discover the story behind this business"}
              </span>
            </span>
            <FontAwesomeIcon
              icon={faBookOpen}
              className={`text-primary transition-transform ${storyExpanded ? "scale-110" : "opacity-60"}`}
            />
          </button>
          {storyExpanded ? (
            <p className="mt-5 whitespace-pre-wrap border-t border-outline-variant/60 pt-5 text-sm leading-8 text-on-surface-variant">
              {storeDetails.storeStory}
            </p>
          ) : null}
        </section>
      ) : null}

      {!loading.details && storeDetails.ratingSettings?.enabled ? (
        <section className="rounded-3xl border border-outline-variant/70 bg-surface p-4 pb-10 shadow-sm sm:p-7">
          <SectionHeading
            icon={faComments}
            title={
              ar ? "التقييمات وآراء العملاء" : "Ratings & customer reviews"
            }
            hint={
              ar
                ? "تجارب موثقة من مجتمع أصول"
                : "Experiences from the ASOL community"
            }
          />
          <ProductReviews
            type="profile"
            targetUid={previewUid}
            ownerUid={previewUid}
            productName={
              storeDetails.storeName || (ar ? "الملف الشخصي" : "Profile")
            }
            reviewsEnabled
            targetEnabled
            commentsEnabled={
              storeDetails.ratingSettings.mode === "stars-comments"
            }
          />
        </section>
      ) : null}
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  hint,
}: {
  icon: IconDefinition;
  title: string;
  hint: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary">
        <FontAwesomeIcon icon={icon} />
      </span>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-xs text-on-surface-variant">{hint}</p>
      </div>
    </div>
  );
}
