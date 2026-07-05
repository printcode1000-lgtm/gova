"use client";

import { govaApi } from "@/core/api/gova-api-client";
import { GOVA_API_ROUTES } from "@/core/api/gova-api-routes";
import type {
  FeaturedMarqueeConfig,
  FeaturedMarqueePublished,
  FeaturedMarqueeRecord,
  SuperAdminIdentity,
} from "../entities/featured-marquee.entity";

export const featuredMarqueeApiService = {
  getCurrent: () =>
    govaApi.get<FeaturedMarqueePublished>(
      GOVA_API_ROUTES.advertisements.featuredMarquee,
    ),

  getAdmin: (identity: SuperAdminIdentity) => {
    const query = new URLSearchParams({
      admin: "1",
      uid: identity.uid,
      phone: identity.phone,
    });
    return govaApi.get<FeaturedMarqueeRecord>(
      `${GOVA_API_ROUTES.advertisements.featuredMarquee}?${query}`,
    );
  },

  save: (identity: SuperAdminIdentity, config: FeaturedMarqueeConfig) =>
    govaApi.put<FeaturedMarqueeRecord>(
      GOVA_API_ROUTES.advertisements.featuredMarquee,
      { identity, config },
    ),
};
