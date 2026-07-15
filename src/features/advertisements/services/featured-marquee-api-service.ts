"use client";

import { asolApi } from "@/core/api/asol-api-client";
import { ASOL_API_ROUTES } from "@/core/api/asol-api-routes";
import type {
  FeaturedMarqueeConfig,
  FeaturedMarqueePublished,
  FeaturedMarqueeRecord,
  SuperAdminIdentity,
} from "../entities/featured-marquee.entity";

export const featuredMarqueeApiService = {
  getCurrent: () =>
    asolApi.get<FeaturedMarqueePublished>(
      ASOL_API_ROUTES.advertisements.featuredMarquee,
    ),

  getVersion: () =>
    asolApi.get<Omit<FeaturedMarqueePublished, "config" | "sectionTitle">>(
      `${ASOL_API_ROUTES.advertisements.featuredMarquee}/version`,
      { suppressErrorLog: true },
    ),

  getAdmin: (identity: SuperAdminIdentity) => {
    const query = new URLSearchParams({
      admin: "1",
      uid: identity.uid,
      phone: identity.phone,
    });
    return asolApi.get<FeaturedMarqueeRecord>(
      `${ASOL_API_ROUTES.advertisements.featuredMarquee}?${query}`,
    );
  },

  save: (
    identity: SuperAdminIdentity,
    config: FeaturedMarqueeConfig,
    checkIntervalMinutes: number,
  ) =>
    asolApi.put<FeaturedMarqueeRecord>(
      ASOL_API_ROUTES.advertisements.featuredMarquee,
      { identity, config, checkIntervalMinutes },
    ),
};
