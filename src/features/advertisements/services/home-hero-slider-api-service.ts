"use client";

import { govaApi } from "@/core/api/gova-api-client";
import { GOVA_API_ROUTES } from "@/core/api/gova-api-routes";
import type {
  HomeHeroConfig,
  HomeHeroPublished,
  HomeHeroRecord,
  SuperAdminIdentity,
} from "../entities/home-hero-slider.entity";

export const homeHeroSliderApiService = {
  getCurrent: () =>
    govaApi.get<HomeHeroPublished>(
      GOVA_API_ROUTES.advertisements.homeHeroSlider,
    ),
  getVersion: () =>
    govaApi.get<Omit<HomeHeroPublished, "config">>(
      GOVA_API_ROUTES.advertisements.homeHeroSliderVersion,
      { suppressErrorLog: true },
    ),
  getAdmin: (identity: SuperAdminIdentity) => {
    const query = new URLSearchParams({
      admin: "1",
      uid: identity.uid,
      phone: identity.phone,
    });
    return govaApi.get<HomeHeroRecord>(
      `${GOVA_API_ROUTES.advertisements.homeHeroSlider}?${query}`,
    );
  },
  save: (
    identity: SuperAdminIdentity,
    config: HomeHeroConfig,
    checkIntervalMinutes: number,
  ) =>
    govaApi.put<HomeHeroRecord>(GOVA_API_ROUTES.advertisements.homeHeroSlider, {
      identity,
      config,
      checkIntervalMinutes,
    }),
};
