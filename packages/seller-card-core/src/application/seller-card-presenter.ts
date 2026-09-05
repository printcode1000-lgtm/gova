import type { ProfileDirectoryEntry } from "@asol/data-core/profile/entities";
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

function getOptional(row: ProfileDirectoryEntry, key: string): unknown {
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

function ratingValue(row: ProfileDirectoryEntry): number | null {
  const directValue =
    getOptional(row, "averageRating") ??
    getOptional(row, "avgRating");
  const directParsed = Number(directValue);
  if (Number.isFinite(directParsed) && directParsed > 0) return directParsed;

  const storedValue = row.ratingAverage;
  const parsed = Number(storedValue);
  if (Number.isFinite(parsed) && parsed > 0) return parsed / 100;
  return null;
}

export function sellerCardTitle(row: ProfileDirectoryEntry): string {
  return text(row.storeName);
}

export function sellerCardAvatar(row: ProfileDirectoryEntry): string {
  const images = {} as StoreImagesLike;
  return (
    text(getOptional(row, "avatarUrl")) ||
    text(images.avatarUrl)
  );
}

export function createSellerCardViewModel(
  row: ProfileDirectoryEntry,
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
    text(row.primaryPhone);
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
      text(row.storeStory),
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
