"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Truck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SellerCard } from "@/components/ui/seller-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_CONSTANTS } from "@/features/categories";
import { normalizeProfileFulfillmentSettings } from "@/features/profile/entities/profile-fulfillment-settings.entity";
import { useProfileFulfillmentSettings } from "@/features/profile/hooks/use-profile-fulfillment-settings";
import { useUsersBySpecialty } from "@/features/profile/hooks/use-users-by-specialty";
import type { UserProfileRow } from "@/features/profile/services/profile-service.interface";
import {
  createSellerCardViewModel,
  type SellerCardAction,
} from "@/features/seller-card";
import { useTranslation } from "@/lib/i18n";
import type {
  ProfileFulfillmentController,
  ProfileSectionStatus,
} from "../profile-save-controller";

export interface FulfillmentSettingsCardProps {
  onStatusChange?: (status: ProfileSectionStatus) => void;
}
