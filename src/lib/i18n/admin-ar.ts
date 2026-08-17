import adminAr from "@/locales/admin-ar.json";
import { publicEnv } from "@/core/config/public-env";

import { interpolate } from "./translate";
import type { TranslationParams } from "./types";

export type AdminArabicKey = keyof typeof adminAr;

export function translateAdminArabic(
  key: string,
  params?: TranslationParams,
): string {
  const text = adminAr[key as AdminArabicKey];
  if (text === undefined) {
    if (publicEnv.developmentBuild) {
      console.warn(`[admin-ar] Missing Arabic copy key: "${key}"`);
    }
    return key;
  }
  return interpolate(text, params);
}
