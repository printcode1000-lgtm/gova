export type ShareResourceKind = "product" | "profile";

export interface ShareContent {
  kind: ShareResourceKind;
  title: string;
  text: string;
  url: string;
  imageUrl?: string | null;
}

export type ShareDestination =
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "system"
  | "copy";

export interface PublicProfileShareRecord {
  uid: string;
  storeDetails: StoreDetailsData;
  storeImages: StoreImagesData;
}
import type { StoreDetailsData } from "@/features/profile";
import type { StoreImagesData } from "@/features/profile";
