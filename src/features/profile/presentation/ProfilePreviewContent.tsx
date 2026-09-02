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


const PROFILE_ACTION_TILE_CLASS = `${ACTION_TILE_CLASS} w-full border-input sm:w-auto`;
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
    <div id='features-profile-presentation-profilepreviewcontent-div-1-y7l5yo'
      data-snapshot-id="profile-preview-root"
      className="mx-auto w-full max-w-6xl min-w-0 space-y-5 overflow-x-clip px-0 sm:space-y-6 sm:px-4"
    >
      <div id='features-profile-presentation-profilepreviewcontent-div-2-pblfex' className="min-w-0">
        {loading.images ? (
          <div id='features-profile-presentation-profilepreviewcontent-div-3-qlnbzd' className="py-8 text-center text-sm text-on-surface-variant">
            {t("profilePreview.loading")}
          </div>
        ) : (
          <div id='features-profile-presentation-profilepreviewcontent-div-4-nc10mc' className="mb-0 -mt-4">
            <HeroSlider id='features-profile-presentation-profilepreviewcontent-heroslider-5-ftci78' mode="view" config={props.heroConfig} />
          </div>
        )}

        {!loading.details ? (
          <section id='features-profile-presentation-profilepreviewcontent-section-6-bhu6tg' className="mx-2 mt-3 min-w-0 border-b border-outline-variant/60 pb-4 sm:mx-0 sm:pb-5 sm:mt-4">
            <div id='features-profile-presentation-profilepreviewcontent-div-7-ebuhdr' className="flex min-w-0 items-start gap-3 sm:gap-4">
              {storeImages.avatarUrl ? (
                <div id='features-profile-presentation-profilepreviewcontent-div-8-rkyqvc' className="relative z-10 -mt-8 h-20 w-20 flex-shrink-0 overflow-hidden rounded-full shadow-lg sm:-mt-10 sm:h-28 sm:w-28">
                  <Image id='features-profile-presentation-profilepreviewcontent-image-9-bbkil1'
                    src={storeImages.avatarUrl}
                    alt="Avatar"
                    width={112}
                    height={112}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}

              <div id='features-profile-presentation-profilepreviewcontent-div-10-ezedca' className="min-w-0 flex-1">
                {previewUid ? (
                  <div id='features-profile-presentation-profilepreviewcontent-div-11-ufnwc9' className="grid min-w-0 grid-cols-2 items-center gap-2 min-[360px]:grid-cols-3 sm:flex sm:flex-wrap">
                    <FollowButton
                      className="w-full sm:w-auto"
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
                    <ShareMenu id='features-profile-presentation-profilepreviewcontent-sharemenu-12-ia5o4h'
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
                        <Button id='features-profile-presentation-profilepreviewcontent-button-13-gxsbrx'
                          type="button"
                          variant="outline"
                          className={PROFILE_ACTION_TILE_CLASS}
                          style={ACTION_TILE_STYLE}
                          aria-label={t("profilePreview.shareAria")}
                        >
                          <FontAwesomeIcon id='features-profile-presentation-profilepreviewcontent-fontawesomeicon-14-qgddng'
                            icon={faShareNodes}
                            className="h-5 w-5"
                          />
                          <span id='features-profile-presentation-profilepreviewcontent-text-15-ni1wzh' className={ACTION_TILE_LABEL_CLASS}>
                            {t("profilePreview.share")}
                          </span>
                        </Button>
                      }
                    />
                    {!props.isOwner ? (
                      <Button id='features-profile-presentation-profilepreviewcontent-button-16-xvq7n6'
                        type="button"
                        variant="outline"
                        className={PROFILE_ACTION_TILE_CLASS}
                        style={ACTION_TILE_STYLE}
                        aria-label={
                          locale === "ar"
                            ? "مراسلة صاحب الصفحة"
                            : "Message page owner"
                        }
                        disabled={openingConversation}
                        onClick={() => void openProfileConversation()}
                      >
                        <FontAwesomeIcon id='features-profile-presentation-profilepreviewcontent-fontawesomeicon-17-a2y5jx' icon={faComments} className="h-5 w-5" />
                        <span id='features-profile-presentation-profilepreviewcontent-text-18-z7gcoh' className={ACTION_TILE_LABEL_CLASS}>
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
                      <Button id='features-profile-presentation-profilepreviewcontent-button-19-upj9jr'
                        type="button"
                        variant="outline"
                        className={PROFILE_ACTION_TILE_CLASS}
                        style={ACTION_TILE_STYLE}
                        aria-label={t("profilePreview.customRequestAria")}
                        onClick={() =>
                          router.push(
                            `/custom-request?sellerUid=${encodeURIComponent(previewUid)}`,
                          )
                        }
                      >
                        <FontAwesomeIcon id='features-profile-presentation-profilepreviewcontent-fontawesomeicon-20-eakagh'
                          icon={faPaperPlane}
                          className="h-5 w-5"
                        />
                        <span id='features-profile-presentation-profilepreviewcontent-text-21-t1anpc' className={ACTION_TILE_LABEL_CLASS}>
                          {t("profilePreview.customRequest")}
                        </span>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {conversationError ? (
                  <p id='features-profile-presentation-profilepreviewcontent-text-22-uyjhsl' className="mt-2 text-xs font-medium text-error" role="alert">
                    {conversationError}
                  </p>
                ) : null}
              </div>
            </div>

            <div id='features-profile-presentation-profilepreviewcontent-div-23-ul5e8f' className="mt-3 min-w-0">
              {storeDetails.storeName ? (
                <h1 id='features-profile-presentation-profilepreviewcontent-heading-24-tkbmhl' className="break-words text-lg font-bold leading-7 text-on-surface sm:text-2xl">
                  {storeDetails.storeName}
                </h1>
              ) : null}
              {storeDetails.storeDescription ? (
                <p id='features-profile-presentation-profilepreviewcontent-text-25-x4epg4' className="mt-1 line-clamp-2 break-words text-xs leading-5 text-on-surface-variant sm:text-sm sm:leading-6">
                  {storeDetails.storeDescription}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {!loading.contacts && contacts ? (
        <section id='features-profile-presentation-profilepreviewcontent-section-26-xy5imy' className="mx-2 min-w-0 rounded-3xl border border-outline-variant/70 bg-surface p-4 shadow-sm sm:mx-0 sm:p-5">
          <div id='features-profile-presentation-profilepreviewcontent-div-27-7jodgq' className="min-w-0">
            <h2 id='features-profile-presentation-profilepreviewcontent-heading-28-flolln' className="mb-3 flex min-w-0 items-center gap-2 break-words text-sm font-bold">
              <FontAwesomeIcon id='features-profile-presentation-profilepreviewcontent-fontawesomeicon-29-x1gf7d' icon={faShareNodes} className="text-primary" />
              {t("profilePreview.quickContact")}
            </h2>
            <ContactActionBar id='features-profile-presentation-profilepreviewcontent-contactactionbar-30-0tzr1u'
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
        <section id='features-profile-presentation-profilepreviewcontent-section-31-haoenz' className="mx-2 min-w-0 overflow-hidden sm:mx-0">
          <FeaturedMarquee id='features-profile-presentation-profilepreviewcontent-featuredmarquee-32-3g5ndp' config={props.featuredConfig} />
        </section>
      ) : null}

      {props.trendingConfig.items.length > 0 ? (
        <section id='features-profile-presentation-profilepreviewcontent-section-33-uyif6z' className="mx-2 min-w-0 overflow-hidden rounded-2xl border border-error/20 shadow-sm sm:mx-0">
          <TrendingRibbon id='features-profile-presentation-profilepreviewcontent-trendingribbon-34-qipdn7' config={props.trendingConfig} />
        </section>
      ) : null}

      {previewUid ? (
        <section id='features-profile-presentation-profilepreviewcontent-section-35-fgx3l5' className="mx-2 min-w-0 rounded-3xl border border-outline-variant/70 bg-surface p-3 shadow-sm sm:mx-0 sm:p-6">
          <ProfilePreviewSectionHeading id='features-profile-presentation-profilepreviewcontent-profilepreviewsectionheading-36-waaq0o'
            icon={faBoxOpen}
            title={t("profilePreview.products")}
            hint={t("profilePreview.productsHint")}
          />
          <ProfileProductsPreview uid={previewUid} />
        </section>
      ) : null}

      {!loading.details && !loading.fulfillment ? (
        <section id='features-profile-presentation-profilepreviewcontent-section-37-u2hb3h' className="mx-2 grid min-w-0 items-stretch gap-5 sm:mx-0 lg:grid-cols-2">
          <div id='features-profile-presentation-profilepreviewcontent-div-38-wu1dyg' className="min-w-0 overflow-hidden rounded-3xl border border-outline-variant/70 bg-surface p-4 shadow-sm sm:p-6 lg:h-full">
            <ProfilePreviewSectionHeading id='features-profile-presentation-profilepreviewcontent-profilepreviewsectionheading-39-6zjuvv'
              icon={faClock}
              title={t("profilePreview.workingHours")}
              hint={t("profilePreview.workingHoursHint")}
            />
            <WorkingHoursCard id='features-profile-presentation-profilepreviewcontent-workinghourscard-40-bkboas'
              mode="preview"
              locale={locale}
              value={storeDetails.workingHours}
            />
            <WorkingHoursNoteCard id='features-profile-presentation-profilepreviewcontent-workinghoursnotecard-41-i6haqf'
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
        <section id='features-profile-presentation-profilepreviewcontent-section-42-psuya6' className="mx-2 min-w-0 rounded-3xl border border-outline-variant/70 bg-surface p-4 pb-10 shadow-sm sm:mx-0 sm:p-7 sm:pb-10">
          <ProfilePreviewSectionHeading id='features-profile-presentation-profilepreviewcontent-profilepreviewsectionheading-43-9mt0je'
            icon={faComments}
            title={t("profilePreview.reviews")}
            hint={t("profilePreview.reviewsHint")}
          />
          <ProductReviews id='features-profile-presentation-profilepreviewcontent-productreviews-44-1s0c26'
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
