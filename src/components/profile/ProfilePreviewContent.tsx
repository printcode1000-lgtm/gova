"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBookOpen,
  faBoxOpen,
  faClock,
  faComments,
  faPaperPlane,
  faShareNodes,
} from "@fortawesome/free-solid-svg-icons";
import { ContactActionBar } from "@/components/ui/contact-action-bar";
import {
  ACTION_TILE_CLASS,
  ACTION_TILE_LABEL_CLASS,
  ACTION_TILE_STYLE,
  Button,
} from "@/components/ui/button";
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
import { SellerDiscountsPreview } from "@/features/seller-discounts";
import type { UserSession } from "@/features/auth/entities/session.entity";
import type { ProfileContactsData } from "@/features/profile/entities/profile-contacts.entity";
import type { ProfileFulfillmentSettings } from "@/features/profile/entities/profile-fulfillment-settings.entity";
import type { StoreDetailsData } from "@/features/profile/entities/store-details.entity";
import type { StoreImagesData } from "@/features/profile/entities/store-images.entity";
import { usePageSnapshot, useSnapshotState } from "@/features/page-snapshot";
import { clipboard, isCancelledError } from "@/native-platform";
import { share } from "@/native-platform/share";
import { useTranslation } from "@/lib/i18n";
import { ProfileProductsPreview } from "./ProfileProductsPreview";
import { ProfileFulfillmentPreviewCard } from "./ProfilePreviewInformation";

const PROFILE_SHARE_ORIGIN = "https://gova-swart.vercel.app/";

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
  const { t } = useTranslation();
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
  const shareStatusTimerRef = useRef<number | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const shareUrl = useMemo(() => {
    if (!previewUid) return "";
    const url = new URL("/profile", PROFILE_SHARE_ORIGIN);
    url.searchParams.set("mode", "preview");
    url.searchParams.set("uid", previewUid);
    return url.toString();
  }, [previewUid]);

  useEffect(() => {
    if (!ready || !previewUid || restoredRef.current === previewUid) return;
    const timer = window.setTimeout(() => {
      restoredRef.current = previewUid;
      void restoreSnapshot();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [previewUid, ready, restoreSnapshot]);

  useEffect(
    () => () => {
      if (shareStatusTimerRef.current) {
        window.clearTimeout(shareStatusTimerRef.current);
      }
    },
    [],
  );

  const showShareStatus = (message: string) => {
    setShareStatus(message);
    if (shareStatusTimerRef.current) {
      window.clearTimeout(shareStatusTimerRef.current);
    }
    shareStatusTimerRef.current = window.setTimeout(() => {
      setShareStatus("");
      shareStatusTimerRef.current = null;
    }, 2200);
  };

  const shareProfile = async () => {
    if (!shareUrl) return;
    const title =
      storeDetails.storeName ||
      (t("profilePreview.pageTitle"));
    try {
      if (await share.canSend()) {
        await share.send({
          title,
          text: t("profilePreview.shareText"),
          url: shareUrl,
        });
        return;
      }
      await clipboard.write(shareUrl);
      showShareStatus(t("profilePreview.linkCopied"));
    } catch (error) {
      // Dismissing the share sheet is not a failure.
      if (isCancelledError(error)) return;
      console.warn("[ProfilePreview] Failed to share profile link.", error);
      try {
        await clipboard.write(shareUrl);
        showShareStatus(t("profilePreview.linkCopied"));
      } catch {
        showShareStatus(t("profilePreview.shareFailed"));
      }
    }
  };

  return (
    <div
      data-snapshot-id="profile-preview-root"
      className="mx-auto w-full max-w-6xl space-y-5 px-0 sm:space-y-6 sm:px-4"
    >
      <div>
        {loading.images ? (
          <div className="py-8 text-center text-sm text-on-surface-variant">
            {t("profilePreview.loading")}
          </div>
        ) : (
          <div className="mb-0 -mt-4">
            <HeroSlider mode="view" config={props.heroConfig} />
          </div>
        )}

        {!loading.details ? (
          <section className="mx-2 mt-3 border-b border-outline-variant/60 pb-4 sm:mx-4 sm:pb-5 sm:mt-4">
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

              <div className="min-w-0 flex-1">
                {previewUid ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <FollowButton
                      targetType="store"
                      targetId={previewUid}
                      targetOwnerUid={previewUid}
                      viewerUid={session?.uid}
                      isOwner={props.isOwner}
                      isSuperAdmin={props.isSuperAdmin}
                      targetLabel={
                        storeDetails.storeName ||
                        (t("profilePreview.providerFallback"))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className={`${ACTION_TILE_CLASS} border-input hover:bg-accent hover:text-accent-foreground`}
                      style={ACTION_TILE_STYLE}
                      title={t("profilePreview.shareAria")}
                      aria-label={t("profilePreview.shareAria")}
                      onClick={() => void shareProfile()}
                    >
                      <FontAwesomeIcon icon={faShareNodes} className="h-5 w-5" />
                      <span className={ACTION_TILE_LABEL_CLASS}>
                        {t("profilePreview.share")}
                      </span>
                    </Button>
                    {storeDetails.profileShowcase?.customRequestEnabled && session?.uid ? (
                      <Button
                        type="button"
                        variant="outline"
                        className={`${ACTION_TILE_CLASS} border-input hover:bg-accent hover:text-accent-foreground`}
                        style={ACTION_TILE_STYLE}
                        title={t("profilePreview.customRequestAria")}
                        aria-label={t("profilePreview.customRequestAria")}
                        onClick={() => {
                          const customRequestButton = document.querySelector('[data-custom-request-trigger]') as HTMLButtonElement;
                          if (customRequestButton) {
                            customRequestButton.click();
                          }
                        }}
                      >
                        <FontAwesomeIcon icon={faPaperPlane} className="h-5 w-5" />
                        <span className={ACTION_TILE_LABEL_CLASS}>
                          {t("profilePreview.customRequest")}
                        </span>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-3 min-w-0">
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
            </div>
          </section>
        ) : null}
      </div>

      {!loading.contacts && contacts ? (
        <section className="grid gap-3 rounded-3xl border border-outline-variant/70 bg-surface p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center sm:p-5">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <FontAwesomeIcon icon={faShareNodes} className="text-primary" />
              {t("profilePreview.quickContact")}
            </h2>
            <ContactActionBar
              data={contacts}
              compact
              className="border-0 bg-transparent p-0 shadow-none"
            />
          </div>
          {shareStatus ? (
            <p className="text-center text-xs font-semibold text-primary" role="status">
              {shareStatus}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Hidden custom request button for icon-only trigger */}
      {storeDetails.profileShowcase?.customRequestEnabled && session?.uid ? (
        <div className="hidden">
          <ProfileCustomRequestButton
            onSubmit={props.onCustomRequest}
            buttonLabel={t("profilePreview.customRequestAria")}
            title={`${t("profilePreview.customRequestTo")} ${storeDetails.storeName || (t("profilePreview.sellerFallback"))}`}
          />
        </div>
      ) : null}



      {previewUid ? (
        <SellerDiscountsPreview sellerUid={previewUid} locale={locale} />
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
            title={t("profilePreview.products")}
            hint={
              t("profilePreview.productsHint")
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
              title={t("profilePreview.workingHours")}
              hint={
                t("profilePreview.workingHoursHint")
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
                {t("profilePreview.storeStory")}
              </strong>
              <span className="text-xs text-on-surface-variant">
                {t("profilePreview.storeStoryHint")}
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
              t("profilePreview.reviews")
            }
            hint={
              t("profilePreview.reviewsHint")
            }
          />
          <ProductReviews
            type="profile"
            targetUid={previewUid}
            ownerUid={previewUid}
            productName={
              storeDetails.storeName || (t("profilePreview.profile"))
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
