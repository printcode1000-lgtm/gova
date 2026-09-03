import type { UserProfileRow } from "@/features/profile";

export type SellerCardVariant =
  | "search"
  | "category-sellers"
  | "doctor-sellers"
  | "linked-provider"
  | "compact";

export type SellerCardActionKind =
  | "view"
  | "select"
  | "remove"
  | "contact"
  | "custom";

export type SellerCardActionTone =
  | "neutral"
  | "primary"
  | "tertiary"
  | "danger";

export interface SellerCardBadge {
  label: string;
  tone?: SellerCardActionTone;
}

export interface SellerCardViewModel {
  uid: string;
  title: string;
  identityLabel: string;
  subtitle: string;
  description: string;
  avatarUrl: string;
  coverUrl: string;
  initials: string;
  href: string;
  ratingText: string;
  ratingValue: number | null;
  badges: SellerCardBadge[];
  profile?: UserProfileRow;
}

export interface SellerCardAction {
  kind: SellerCardActionKind;
  label: string;
  active?: boolean;
  disabled?: boolean;
  tone?: SellerCardActionTone;
  onClick: () => void;
}
