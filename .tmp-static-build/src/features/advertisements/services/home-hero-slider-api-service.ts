"use client";

import { asolApi } from "@/core/api/asol-api-client";
import { ASOL_API_ROUTES } from "@/core/api/asol-api-routes";
import type {
  HomeHeroConfig,
  HomeHeroPublished,
  HomeHeroRecord,
  SuperAdminIdentity,
} from "../entities/home-hero-slider.entity";

export const homeHeroSliderApiService = {
  getCurrent: () =>
    asolApi.get<HomeHeroPublished>(
      ASOL_API_ROUTES.advertisements.homeHeroSlider,
    ),
  getVersion: () =>
    asolApi.get<Omit<HomeHeroPublished, "config">>(
      ASOL_API_ROUTES.advertisements.homeHeroSliderVersion,
      { suppressErrorLog: true },
    ),
  getAdmin: (identity: SuperAdminIdentity) => {
    const query = new URLSearchParams({
      admin: "1",
      uid: identity.uid,
      phone: identity.phone,
    });
    return asolApi.get<HomeHeroRecord>(
      `${ASOL_API_ROUTES.advertisements.homeHeroSlider}?${query}`,
    );
  },
  save: (
    identity: SuperAdminIdentity,
    config: HomeHeroConfig,
    checkIntervalMinutes: number,
  ) =>
    asolApi.put<HomeHeroRecord>(ASOL_API_ROUTES.advertisements.homeHeroSlider, {
      identity,
      config,
      checkIntervalMinutes,
    }),
};
