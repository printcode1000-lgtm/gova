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
import { BOTTOM_NAV_CLEARANCE } from "@/shared/layouts/bottom-nav-layout";
import { ProfileContactsCard } from "@/features/profile/presentation/ProfileContactsCard";
import { ProfileRegistrationInfoCard } from "@/features/profile/presentation/ProfileRegistrationInfoCard";
import { SpecialtiesCard } from "@/features/profile/presentation/SpecialtiesCard";
import { ProductsCard } from "@/features/profile/presentation/ProductsCard";
import { StoreIdentityCard } from "@/features/profile/presentation/StoreIdentityCard";
import { FulfillmentSettingsCard } from "@/features/profile/presentation/FulfillmentSettingsCard";
import { WorkingHoursProfileCard } from "@/features/profile/presentation/WorkingHoursProfileCard";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { useTranslation } from "@/shared/i18n";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import type { FeaturedMarqueeConfig } from "@/features/advertisements/ui";
import type { HeroSliderConfig } from "@/features/advertisements/ui";
import type { TrendingRibbonConfig } from "@/features/advertisements/ui";
import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type { ProductRecord } from "@/features/product";
import { productApiService } from "@/features/product/ui";
import { usePageSnapshot } from "@/features/page-snapshot";
import { useProfileStoreImages } from "@/features/profile/presentation/hooks/use-profile-store-images";
import { useStoreDetails } from "@/features/profile/presentation/hooks/use-store-details";
import { useProfilePublicContacts } from "@/features/profile/presentation/hooks/use-profile-public-contacts";
import { useProfilePublicFulfillmentSettings } from "@/features/profile/presentation/hooks/use-profile-public-fulfillment-settings";
import {
  SellerDiscountsManager,
  type SellerDiscountsController,
} from "@/features/seller-discounts/ui";
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
