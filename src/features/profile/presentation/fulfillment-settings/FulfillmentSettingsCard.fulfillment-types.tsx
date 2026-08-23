"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Truck } from "lucide-react";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SellerCard } from "@/features/seller-card/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { CATEGORY_CONSTANTS } from "@/features/categories";
import { normalizeProfileFulfillmentSettings } from "@/features/profile/domain/profile-fulfillment-settings.entity";
import { useProfileFulfillmentSettings } from "@/features/profile/hooks/use-profile-fulfillment-settings";
import { useUsersBySpecialty } from "@/features/profile/hooks/use-users-by-specialty";
import type { UserProfileRow } from "@/features/profile/services/profile-service.interface";
import {
  createSellerCardViewModel,
  type SellerCardAction,
} from "@/features/seller-card";
import { useTranslation } from "@/shared/i18n";
import type {
  ProfileFulfillmentController,
  ProfileSectionStatus,
} from "../profile-save-controller";

export interface FulfillmentSettingsCardProps {
  onStatusChange?: (status: ProfileSectionStatus) => void;
}
