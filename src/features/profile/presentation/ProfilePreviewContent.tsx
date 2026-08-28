"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faClock,
  faComments,
  faPaperPlane,
  faShareNodes,
} from "@fortawesome/free-solid-svg-icons";
import { ContactActionBar } from "@/shared/ui/contact-action-bar";
import {
  ACTION_TILE_CLASS,
  ACTION_TILE_LABEL_CLASS,
  ACTION_TILE_STYLE,
  Button,
} from "@/shared/ui/button";
import {
  FeaturedMarquee,
  type FeaturedMarqueeConfig,
} from "@/features/advertisements/ui";
import { FollowButton } from "@/features/follow/ui";
import { HeroSlider, type HeroSliderConfig } from "@/features/advertisements/ui";
import {
  TrendingRibbon,
  type TrendingRibbonConfig,
} from "@/features/advertisements/ui";
import {
  WorkingHoursCard,
  WorkingHoursNoteCard,
} from "@/features/profile-working-hours/ui";
import { ProductReviews } from "@/features/product/ui";
import { SellerDiscountsPreview } from "@/features/seller-discounts/ui";
import type { SessionRuntimeUser } from "@/shared/session-runtime";
import type { ProfileContactsData } from "@/features/profile/domain/profile-contacts.entity";
import type { ProfileFulfillmentSettings } from "@/features/profile/domain/profile-fulfillment-settings.entity";
import type { StoreDetailsData } from "@/features/profile/domain/store-details.entity";
import type { StoreImagesData } from "@/features/profile/domain/store-images.entity";
import { usePageSnapshot, useSnapshotState } from "@/features/page-snapshot";
import { specialtyChatClient } from "@/features/specialty-chat";
import {
  buildProfileShareUrl,
  ShareMenu,
} from "@/features/sharing";
import { useTranslation } from "@/shared/i18n";
import { ProfileProductsPreview } from "./ProfileProductsPreview";
import { ProfileFulfillmentPreviewCard } from "./ProfilePreviewInformation";
import { ProfilePreviewSectionHeading } from "./ProfilePreviewSectionHeading";
import { ProfileStorySection } from "./ProfileStorySection";
import type { UiDescriptor } from "@asol/ui-registry-core";

interface ProfilePreviewContentProps {
  locale: "ar" | "en";
  previewUid: string;
  session: SessionRuntimeUser | null;
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
}


const PROFILE_FOLLOW_UI: UiDescriptor = { uid: "profile-follow-b9hOQF", id: "profile-follow", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "profile-follow" } };
export function ProfilePreviewContent(props: ProfilePreviewContentProps) {
  const router = useRouter();
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
  const shareUrl = previewUid ? buildProfileShareUrl(previewUid) : "";
  const [openingConversation, setOpeningConversation] = useState(false);
  const [conversationError, setConversationError] = useState("");

  const openProfileConversation = async () => {
    if (!previewUid || props.isOwner || openingConversation) return;
    if (!session) {
      router.push("/login");
      return;
    }
    setOpeningConversation(true);
    setConversationError("");
    const storeName =
      storeDetails.storeName || t("profilePreview.providerFallback");
    try {
      const requestId = `req_${crypto.randomUUID().replace(/-/g, "")}`;
      const result = await specialtyChatClient.startProfileConversation(session, {
        requestId,
        sellerUid: previewUid,
        storeName,
        message:
          locale === "ar"
            ? `أرغب في التواصل مع ${storeName}`
            : `I would like to contact ${storeName}`,
      });
      router.push(
        `/notifications/chat?conversationId=${encodeURIComponent(result.conversationKey)}`,
      );
    } catch (error) {
      setConversationError(
        error instanceof Error &&
          error.message === "specialtyChatRecipientUnavailable"
          ? locale === "ar"
            ? "لا يمكن الوصول إلى صاحب الصفحة حاليًا."
            : "The page owner is currently unavailable."
          : locale === "ar"
            ? "تعذر فتح المحادثة. حاول مرة أخرى."
            : "Unable to open the conversation. Try again.",
      );
    } finally {
      setOpeningConversation(false);
    }
  };

  useEffect(() => {
    if (!ready || !previewUid || restoredRef.current === previewUid) return;
    const timer = window.setTimeout(() => {
      restoredRef.current = previewUid;
      void restoreSnapshot();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [previewUid, ready, restoreSnapshot]);

  return (
    <div id="profile.profile-preview-content.div"
      data-snapshot-id="profile-preview-root"
      className="mx-auto w-full max-w-6xl space-y-5 px-0 sm:space-y-6 sm:px-4"
    >
      <div id="profile.profile-preview-content.div.2">
        {loading.images ? (
          <div id="profile.profile-preview-content.div.3" className="py-8 text-center text-sm text-on-surface-variant">
            {t("profilePreview.loading")}
          </div>
        ) : (
          <div id="profile.profile-preview-content.div.4" className="mb-0 -mt-4">
            <HeroSlider id="profile.profile-preview-content.hero-slider" mode="view" config={props.heroConfig} />
          </div>
        )}

        {!loading.details ? (
          <section id="profile.profile-preview-content.section" className="mx-2 mt-3 border-b border-outline-variant/60 pb-4 sm:mx-4 sm:pb-5 sm:mt-4">
            <div id="profile.profile-preview-content.div.5" className="flex min-w-0 items-start gap-3 sm:gap-4">
              {storeImages.avatarUrl ? (
                <div id="profile.profile-preview-content.div.6" className="relative z-10 -mt-8 h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-4 border-surface shadow-lg sm:-mt-10 sm:h-28 sm:w-28">
                  <Image id="profile.profile-preview-content.image"
                    src={storeImages.avatarUrl}
                    alt="Avatar"
                    width={112}
                    height={112}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}

              <div id="profile.profile-preview-content.div.7" className="min-w-0 flex-1">
                {previewUid ? (
                  <div id="profile.profile-preview-content.div.8" className="flex flex-wrap items-center gap-2">
                    <FollowButton
                      ui={PROFILE_FOLLOW_UI}
                      targetType="store"
                      targetId={previewUid}
                      targetOwnerUid={previewUid}
                      viewerUid={session?.uid}
                      isOwner={props.isOwner}
                      isSuperAdmin={props.isSuperAdmin}
                      targetLabel={
                        storeDetails.storeName ||
                        t("profilePreview.providerFallback")
                      }
                    />
                    <ShareMenu id="profile.profile-preview-content.share-menu"
                      locale={locale}
                      content={{
                        kind: "profile",
                        title:
                          storeDetails.storeName ||
                          t("profilePreview.pageTitle"),
                        text:
                          storeDetails.storeDescription ||
                          t("profilePreview.shareText"),
                        url: shareUrl,
                        imageUrl: storeImages.avatarUrl || storeImages.coverUrl,
                      }}
                      trigger={
                        <Button id="profile.profile-preview-content.button" ui={{ uid: "profile-preview.share-k2xSN8", id: "profile-preview.share", kind: "action", action: "share-profile", part: "actions", interaction: { type: "tap" }, simulation: { kind: "event", id: "profile-share" } }}
                          type="button"
                          variant="outline"
                          className={`${ACTION_TILE_CLASS} border-input  `}
                          style={ACTION_TILE_STYLE}
                          aria-label={t("profilePreview.shareAria")}
                        >
                          <FontAwesomeIcon id="profile.profile-preview-content.font-awesome-icon"
                            icon={faShareNodes}
                            className="h-5 w-5"
                          />
                          <span id="profile.profile-preview-content.span" className={ACTION_TILE_LABEL_CLASS}>
                            {t("profilePreview.share")}
                          </span>
                        </Button>
                      }
                    />
                    {!props.isOwner ? (
                      <Button id="profile.profile-preview-content.button.2" ui={{ uid: "profile-preview.contact-owner-8nEnzn", id: "profile-preview.contact-owner", kind: "action", action: "contact-owner", part: "actions", interaction: { type: "tap" }, simulation: { kind: "event", id: "profile-contact" } }}
                        type="button"
                        variant="outline"
                        className={`${ACTION_TILE_CLASS} border-input  `}
                        style={ACTION_TILE_STYLE}
                        aria-label={
                          locale === "ar"
                            ? "مراسلة صاحب الصفحة"
                            : "Message page owner"
                        }
                        disabled={openingConversation}
                        onClick={() => void openProfileConversation()}
                      >
                        <FontAwesomeIcon id="profile.profile-preview-content.font-awesome-icon.2" icon={faComments} className="h-5 w-5" />
                        <span id="profile.profile-preview-content.span.2" className={ACTION_TILE_LABEL_CLASS}>
                          {openingConversation
                            ? locale === "ar"
                              ? "جارٍ الفتح"
                              : "Opening"
                            : locale === "ar"
                              ? "دردشة"
                              : "Chat"}
                        </span>
                      </Button>
                    ) : null}
                    {storeDetails.profileShowcase?.customRequestEnabled &&
                    session?.uid &&
                    (!props.isOwner || props.isSuperAdmin) ? (
                      <Button id="profile.profile-preview-content.button.3" ui={{ uid: "profile-preview.custom-request-RK4Jqi", id: "profile-preview.custom-request", kind: "action", action: "open-custom-request", part: "actions", interaction: { type: "tap" }, simulation: { kind: "event", id: "profile-custom-request" } }}
                        type="button"
                        variant="outline"
                        className={`${ACTION_TILE_CLASS} border-input  `}
                        style={ACTION_TILE_STYLE}
                        aria-label={t("profilePreview.customRequestAria")}
                        onClick={() =>
                          router.push(
                            `/custom-request?sellerUid=${encodeURIComponent(previewUid)}`,
                          )
                        }
                      >
                        <FontAwesomeIcon id="profile.profile-preview-content.font-awesome-icon.3"
                          icon={faPaperPlane}
                          className="h-5 w-5"
                        />
                        <span id="profile.profile-preview-content.span.3" className={ACTION_TILE_LABEL_CLASS}>
                          {t("profilePreview.customRequest")}
                        </span>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {conversationError ? (
                  <p id="profile.profile-preview-content.p" className="mt-2 text-xs font-medium text-error" role="alert">
                    {conversationError}
                  </p>
                ) : null}
              </div>
            </div>

            <div id="profile.profile-preview-content.div.9" className="mt-3 min-w-0">
              {storeDetails.storeName ? (
                <h1 id="profile.profile-preview-content.h1" className="break-words text-lg font-bold leading-7 text-on-surface sm:text-2xl">
                  {storeDetails.storeName}
                </h1>
              ) : null}
              {storeDetails.storeDescription ? (
                <p id="profile.profile-preview-content.p.2" className="mt-1 line-clamp-2 break-words text-xs leading-5 text-on-surface-variant sm:text-sm sm:leading-6">
                  {storeDetails.storeDescription}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {!loading.contacts && contacts ? (
        <section id="profile.profile-preview-content.section.2" className="grid gap-3 rounded-3xl border border-outline-variant/70 bg-surface p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center sm:p-5">
          <div id="profile.profile-preview-content.div.10">
            <h2 id="profile.profile-preview-content.h2" className="mb-3 flex items-center gap-2 text-sm font-bold">
              <FontAwesomeIcon id="profile.profile-preview-content.font-awesome-icon.4" icon={faShareNodes} className="text-primary" />
              {t("profilePreview.quickContact")}
            </h2>
            <ContactActionBar id="profile.profile-preview-content.contact-action-bar"
              data={contacts}
              compact
              className="border-0 bg-transparent p-0 shadow-none"
            />
          </div>
        </section>
      ) : null}

      {previewUid ? (
        <SellerDiscountsPreview sellerUid={previewUid} locale={locale} />
      ) : null}

      {!loading.featured && props.hasFeaturedProducts ? (
        <section id="profile.profile-preview-content.section.3" className="mx-2 sm:mx-4">
          <FeaturedMarquee id="profile.profile-preview-content.featured-marquee" config={props.featuredConfig} />
        </section>
      ) : null}

      {props.trendingConfig.items.length > 0 ? (
        <section id="profile.profile-preview-content.section.4" className="overflow-hidden rounded-2xl border border-error/20 shadow-sm">
          <TrendingRibbon id="profile.profile-preview-content.trending-ribbon" config={props.trendingConfig} />
        </section>
      ) : null}

      {previewUid ? (
        <section id="profile.profile-preview-content.section.5" className="rounded-3xl border border-outline-variant/70 bg-surface p-3 shadow-sm sm:p-6">
          <ProfilePreviewSectionHeading id="profile.profile-preview-content.profile-preview-section-heading"
            icon={faBoxOpen}
            title={t("profilePreview.products")}
            hint={t("profilePreview.productsHint")}
          />
          <ProfileProductsPreview uid={previewUid} />
        </section>
      ) : null}

      {!loading.details && !loading.fulfillment ? (
        <section id="profile.profile-preview-content.section.6" className="grid items-stretch gap-5 lg:grid-cols-2">
          <div id="profile.profile-preview-content.div.11" className="h-full rounded-3xl border border-outline-variant/70 bg-surface p-4 shadow-sm sm:p-6">
            <ProfilePreviewSectionHeading id="profile.profile-preview-content.profile-preview-section-heading.2"
              icon={faClock}
              title={t("profilePreview.workingHours")}
              hint={t("profilePreview.workingHoursHint")}
            />
            <WorkingHoursCard id="profile.profile-preview-content.working-hours-card"
              mode="preview"
              locale={locale}
              value={storeDetails.workingHours}
            />
            <WorkingHoursNoteCard id="profile.profile-preview-content.working-hours-note-card"
              mode="preview"
              locale={locale}
              note={storeDetails.workingHours.note}
            />
          </div>
          <ProfileFulfillmentPreviewCard
            locale={locale}
            fulfillment={fulfillment}
          />
        </section>
      ) : null}

      {!loading.details && storeDetails.storeStory ? (
        <ProfileStorySection
          story={storeDetails.storeStory}
          expanded={storyExpanded}
          setExpanded={setStoryExpanded}
          title={t("profilePreview.storeStory")}
          hint={t("profilePreview.storeStoryHint")}
        />
      ) : null}

      {!loading.details && storeDetails.ratingSettings?.enabled ? (
        <section id="profile.profile-preview-content.section.7" className="rounded-3xl border border-outline-variant/70 bg-surface p-4 pb-10 shadow-sm sm:p-7">
          <ProfilePreviewSectionHeading id="profile.profile-preview-content.profile-preview-section-heading.3"
            icon={faComments}
            title={t("profilePreview.reviews")}
            hint={t("profilePreview.reviewsHint")}
          />
          <ProductReviews id="profile.profile-preview-content.product-reviews"
            type="profile"
            targetUid={previewUid}
            ownerUid={previewUid}
            productName={storeDetails.storeName || t("profilePreview.profile")}
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

