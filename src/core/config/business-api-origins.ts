import {
  CONTROL_BASE_URL,
  NOTIFICATIONS_BASE_URL,
  ORDERS_BASE_URL,
  PRODUCTS_BASE_URL,
  PROFILES_BASE_URL,
  SUB2MAIN_BASE_URL,
  SUBMAIN_BASE_URL,
} from "@asol/native-core/platform-defaults";
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
 *
 * The fall-back is the canonical deployment declaration in `@asol/native-core`
 * — the same constant `build:static` bakes into the static and native bundles
 * and the same one the deployed-smoke gates probe. It is here so Development,
 * Static, Android and iOS cannot drift in account address: `next dev` runs the
 * local UI but addresses application data exactly like a released bundle, and
 * an unset variable no longer turns into a same-origin business call against a
 * gova runtime that implements no business route. An explicit
 * `NEXT_PUBLIC_ASOL_*_URL` still wins, so a staging origin stays configurable
 * without editing code.
 */
function trim(value: string | undefined): string {
  return value?.replace(/\/$/, "") || "";
}

function origin(configured: string | undefined, canonical: string): string {
  return trim(configured) || trim(canonical);
}

export function businessApiOrigins(): Record<ApiOwner, string> {
  return {
    control: origin(process.env.NEXT_PUBLIC_ASOL_CONTROL_URL, CONTROL_BASE_URL),
    notifications: origin(
      process.env.NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL,
      NOTIFICATIONS_BASE_URL,
    ),
    products: origin(process.env.NEXT_PUBLIC_ASOL_PRODUCTS_URL, PRODUCTS_BASE_URL),
    orders: origin(process.env.NEXT_PUBLIC_ASOL_ORDERS_URL, ORDERS_BASE_URL),
    profiles: origin(process.env.NEXT_PUBLIC_ASOL_PROFILES_URL, PROFILES_BASE_URL),
    submain: origin(process.env.NEXT_PUBLIC_ASOL_SUBMAIN_URL, SUBMAIN_BASE_URL),
    sub2main: origin(process.env.NEXT_PUBLIC_ASOL_SUB2MAIN_URL, SUB2MAIN_BASE_URL),
  };
}
