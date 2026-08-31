import type { ApiOwner } from "@asol/account-bridge/routes";

/**
 * Public origin of each Business API owner.
 *
 * This module exists apart from `public-env` so the gova compatibility
 * boundary has one thing to import. That boundary runs in front of every API
 * request and must be provably free of business capability, so what it reads
 * has to be exactly seven public origins and nothing else — not a barrel that
 * also carries OTA keys, R2 URLs, and build metadata.
 *
 * Every value is public by construction: these are the addresses the browser
 * already calls directly. None of them is a credential. Each is read as a
 * literal `process.env.NEXT_PUBLIC_*` member so the bundler can inline it;
 * a computed lookup would leave the boundary reading nothing in a static build.
 */
function trim(value: string | undefined): string {
  return value?.replace(/\/$/, "") || "";
}

export function businessApiOrigins(): Record<ApiOwner, string> {
  return {
    control: trim(process.env.NEXT_PUBLIC_ASOL_CONTROL_URL),
    notifications: trim(process.env.NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL),
    products: trim(process.env.NEXT_PUBLIC_ASOL_PRODUCTS_URL),
    orders: trim(process.env.NEXT_PUBLIC_ASOL_ORDERS_URL),
    profiles: trim(process.env.NEXT_PUBLIC_ASOL_PROFILES_URL),
    submain: trim(process.env.NEXT_PUBLIC_ASOL_SUBMAIN_URL),
    sub2main: trim(process.env.NEXT_PUBLIC_ASOL_SUB2MAIN_URL),
  };
}
