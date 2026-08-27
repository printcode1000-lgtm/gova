#!/usr/bin/env tsx
import {
  API_BASE_URL,
  NOTIFICATIONS_BASE_URL,
  ORDERS_BASE_URL,
  PRODUCTS_BASE_URL,
  PROFILES_BASE_URL,
  SUBMAIN_BASE_URL,
  SUB2MAIN_BASE_URL,
} from "@asol/native-core";

/**
 * Where each deployed account actually lives, for the gates that ask it a question.
 *
 * `smoke:deployed` used to refuse to run unless seven `NEXT_PUBLIC_ASOL_*_URL`
 * variables were exported by hand. That was not a safety property: an unset
 * variable stopped the gate instead of checking an account, and the value the
 * operator would have typed is the one already declared in `@asol/native-core`
 * — the same declaration `build:static` bakes into the static and native
 * bundles, which is precisely why probing it proves something about the mobile
 * app.
 *
 * An explicit environment value still wins, so a staging origin or a renamed
 * project remains testable without editing code. What is never possible is
 * skipping an account: when neither source yields an absolute URL, resolution
 * fails and names the account.
 */
export const ACCOUNT_ORIGIN_ENV: Readonly<Record<string, string>> = {
  main: "NEXT_PUBLIC_ASOL_API_BASE_URL",
  profiles: "NEXT_PUBLIC_ASOL_PROFILES_URL",
  products: "NEXT_PUBLIC_ASOL_PRODUCTS_URL",
  orders: "NEXT_PUBLIC_ASOL_ORDERS_URL",
  notifications: "NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL",
  submain: "NEXT_PUBLIC_ASOL_SUBMAIN_URL",
  sub2main: "NEXT_PUBLIC_ASOL_SUB2MAIN_URL",
};

/** Canonical production origins, declared once in `@asol/native-core`. */
export const ACCOUNT_CANONICAL_ORIGIN: Readonly<Record<string, string>> = {
  main: API_BASE_URL,
  profiles: PROFILES_BASE_URL,
  products: PRODUCTS_BASE_URL,
  orders: ORDERS_BASE_URL,
  notifications: NOTIFICATIONS_BASE_URL,
  submain: SUBMAIN_BASE_URL,
  sub2main: SUB2MAIN_BASE_URL,
};

export interface ResolvedDeployedOrigin {
  readonly origin: string;
  readonly source: "environment" | "declaration";
  readonly envVar: string;
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().replace(/\/$/, "");
}

export function resolveDeployedOrigin(
  account: string,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedDeployedOrigin {
  const envVar = ACCOUNT_ORIGIN_ENV[account];
  if (!envVar) {
    throw new Error(`No NEXT_PUBLIC_ASOL_* origin mapping for account "${account}".`);
  }

  const fromEnv = normalize(env[envVar]);
  if (fromEnv) return { origin: fromEnv, source: "environment", envVar };

  const declared = normalize(ACCOUNT_CANONICAL_ORIGIN[account]);
  if (/^https?:\/\/.+/.test(declared)) {
    return { origin: declared, source: "declaration", envVar };
  }

  throw new Error(
    `[deployed-smoke] no production origin resolved for "${account}". ` +
      `Set ${envVar}, or fix the declared constant in @asol/native-core. ` +
      "Do not skip an account.",
  );
}
