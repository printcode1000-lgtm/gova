"use client";

import { govaApi } from "@/core/api/gova-api-client";
import { GOVA_API_ROUTES } from "@/core/api/gova-api-routes";
import type {
  TrendingRibbonConfig,
  TrendingRibbonPublished,
  TrendingRibbonRecord,
} from "../entities/trending-ribbon.entity";

type TrendingRibbonVersion = Pick<
  TrendingRibbonPublished,
  "version" | "updatedAt" | "checkIntervalMinutes"
>;

export const trendingRibbonApiService = {
  getCurrent: () =>
    govaApi.get<TrendingRibbonPublished>(
      GOVA_API_ROUTES.advertisements.trendingRibbon,
    ),

  getVersion: () =>
    govaApi.get<TrendingRibbonVersion>(
      GOVA_API_ROUTES.advertisements.trendingRibbonVersion,
      { suppressErrorLog: true },
    ),

  getAdmin: (identity: { uid: string; phone: string }) => {
    const query = new URLSearchParams({
      admin: "1",
      uid: identity.uid,
      phone: identity.phone,
    });
    return govaApi.get<TrendingRibbonRecord>(
      `${GOVA_API_ROUTES.advertisements.trendingRibbon}?${query.toString()}`,
    );
  },

  save: (
    identity: { uid: string; phone: string },
    config: TrendingRibbonConfig,
    checkIntervalMinutes: number,
  ) =>
    govaApi.put<TrendingRibbonRecord>(
      GOVA_API_ROUTES.advertisements.trendingRibbon,
      { identity, config, checkIntervalMinutes },
    ),
};
