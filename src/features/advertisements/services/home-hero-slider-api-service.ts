"use client";

import { govaApi } from "@/core/api/gova-api-client";
import { GOVA_API_ROUTES } from "@/core/api/gova-api-routes";
import type {
  HomeHeroConfig,
  HomeHeroPublished,
  HomeHeroPublication,
  HomeHeroRecord,
  SuperAdminIdentity,
} from "../entities/home-hero-slider.entity";

export const homeHeroSliderApiService = {
  getPublished: () =>
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
    action: "save-draft" | "publish",
    identity: SuperAdminIdentity,
    config: HomeHeroConfig,
    checkIntervalMinutes: number,
    expectedRevision: number,
  ) =>
    govaApi.put<HomeHeroRecord>(GOVA_API_ROUTES.advertisements.homeHeroSlider, {
      action,
      identity,
      config,
      checkIntervalMinutes,
      expectedRevision,
    }),
  listPublications: (identity: SuperAdminIdentity) => {
    const query = new URLSearchParams({
      history: "1",
      uid: identity.uid,
      phone: identity.phone,
    });
    return govaApi.get<HomeHeroPublication[]>(
      `${GOVA_API_ROUTES.advertisements.homeHeroSlider}?${query}`,
    );
  },
  restore: (
    identity: SuperAdminIdentity,
    publicationId: number,
    checkIntervalMinutes: number,
    expectedRevision: number,
  ) =>
    govaApi.put<HomeHeroRecord>(GOVA_API_ROUTES.advertisements.homeHeroSlider, {
      action: "restore",
      identity,
      publicationId,
      checkIntervalMinutes,
      expectedRevision,
    }),
};
