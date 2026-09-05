import type { UserProfileRow } from "@asol/data-core/profile";
import type {
  SellerCardBadge,
  SellerCardViewModel,
} from "../domain/seller-card.types";

interface StoreImagesLike {
  avatarUrl?: unknown;
  coverUrl?: unknown;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getOptional(row: UserProfileRow, key: string): unknown {
  return (row as unknown as Record<string, unknown>)[key];
}

function initialsFromName(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[1]?.[0] ?? "" : "";
  return `${first}${second}`.toUpperCase();
}

function profileUrl(uid: string) {
  return `/profile?mode=view&uid=${encodeURIComponent(uid)}`;
}

function ratingValue(row: UserProfileRow): number | null {
  const directValue =
    getOptional(row, "averageRating") ??
    getOptional(row, "avgRating") ??
    getOptional(row, "avg_rating");
  const directParsed = Number(directValue);
  if (Number.isFinite(directParsed) && directParsed > 0) return directParsed;

  const storedValue = getOptional(row, "ratingAverage") ?? getOptional(row, "rating_average");
  const parsed = Number(storedValue);
  if (Number.isFinite(parsed) && parsed > 0) return parsed / 100;
  return null;
}

export function sellerCardTitle(row: UserProfileRow): string {
  return text(row.storeName) || text(getOptional(row, "store_name"));
}

export function sellerCardAvatar(row: UserProfileRow): string {
  const images = {} as StoreImagesLike;
  return (
    text(getOptional(row, "avatarUrl")) ||
    text(images.avatarUrl) ||
    text(getOptional(row, "avatar_url"))
  );
}

export function createSellerCardViewModel(
  row: UserProfileRow,
  options: {
    badge?: string;
    subtitle?: string;
  } = {},
): SellerCardViewModel {
  const images = {} as StoreImagesLike;
  const title = sellerCardTitle(row);
  const identityLabel =
    title ||
    text(getOptional(row, "registrationPhone")) ||
    text(row.primaryPhone) ||
    text(getOptional(row, "primary_phone"));
  const rating = ratingValue(row);
  const badges: SellerCardBadge[] = [];

  if (options.badge) badges.push({ label: options.badge, tone: "primary" });

  return {
    uid: row.uid,
    title,
    identityLabel,
    subtitle: options.subtitle ?? "",
    description:
      text(row.storeDescription) ||
      text(getOptional(row, "store_description")) ||
      text(row.storeStory) ||
      text(getOptional(row, "store_story")),
    avatarUrl: sellerCardAvatar(row),
    coverUrl: text(getOptional(row, "coverUrl")) || text(images.coverUrl),
    initials: initialsFromName(title),
    href: profileUrl(row.uid),
    ratingText: rating === null ? "" : `${rating.toFixed(1)} / 5`,
    ratingValue: rating,
    badges,
    profile: row,
  };
}
