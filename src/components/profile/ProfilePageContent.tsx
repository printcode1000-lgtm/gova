"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogIn,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
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
  faTruckFast,
  faTriangleExclamation,
  faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { BOTTOM_NAV_CLEARANCE } from "@/components/layouts/bottom-nav-layout";
import { ProfileContactsCard } from "@/components/profile/ProfileContactsCard";
import { ProfileRegistrationInfoCard } from "@/components/profile/ProfileRegistrationInfoCard";
import { SpecialtiesCard } from "@/components/profile/SpecialtiesCard";
import { ProductsCard } from "@/components/profile/ProductsCard";
import { StoreIdentityCard } from "@/components/profile/StoreIdentityCard";
import { FulfillmentSettingsCard } from "@/components/profile/FulfillmentSettingsCard";
import { WorkingHoursProfileCard } from "@/components/profile/WorkingHoursProfileCard";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FeaturedMarqueeConfig } from "@/components/ui/FeaturedMarquee";
import type { HeroSliderConfig } from "@/components/ui/HeroSlider";
import type { TrendingRibbonConfig } from "@/components/ui/TrendingRibbon";
import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import { productApiService } from "@/features/product/services/product-api-service";
import { usePageSnapshot } from "@/features/page-snapshot";
import { useProfileStoreImages } from "@/features/profile/hooks/use-profile-store-images";
import { useStoreDetails } from "@/features/profile/hooks/use-store-details";
import { useProfilePublicContacts } from "@/features/profile/hooks/use-profile-public-contacts";
import { useProfilePublicFulfillmentSettings } from "@/features/profile/hooks/use-profile-public-fulfillment-settings";
import {
  SellerDiscountsManager,
  type SellerDiscountsController,
} from "@/features/seller-discounts";
import { ProfilePreviewContent } from "./ProfilePreviewContent";
import type {
  ProfileContactsController,
  ProfileRegistrationController,
  ProfileSpecialtiesController,
  ProfileFulfillmentController,
  StoreDetailsController,
} from "./profile-save-controller";
import type {
  ProfileEditTab,
  ProfileSectionStatus,
} from "./profile-page.types";
import { PROFILE_SECTION_IDS, PROFILE_SECTIONS } from "./profile-page.types";
import { useProfileNavigation } from "./use-profile-navigation";
import { useProfileSave } from "./use-profile-save";
import type { PublicProfileShareRecord } from "@/features/sharing";
import { PROFILE_EDIT_TAB_COLORS, PROFILE_EDIT_TAB_ICONS, ProfileEditSectionFrame } from "./profile-page/ProfilePageContent.profile-tabs";

import { useProfilePageContentModel } from "./profile-page/ProfilePageContent.model";

import { ProfilePageContentView } from "./profile-page/ProfilePageContent.view";

export function ProfilePageContent({
  initialPublicProfile = null,
}: {
  initialPublicProfile?: PublicProfileShareRecord | null;
} = {}){
  const model = useProfilePageContentModel({ initialPublicProfile });
  if (model.earlyView) return model.earlyView;
  return <ProfilePageContentView model={model} />;
}
