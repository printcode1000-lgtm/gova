import type { ShippingProvider } from "@/lib/onboarding/types";

export const SHIPPING_PROVIDERS: ShippingProvider[] = [
  "standard",
  "express",
  "same_day",
  "international",
];

export const SHIPPING_ICONS: Record<ShippingProvider, string> = {
  standard: "📦",
  express: "🚀",
  same_day: "⚡",
  international: "✈️",
  pickup: "🏪",
};
