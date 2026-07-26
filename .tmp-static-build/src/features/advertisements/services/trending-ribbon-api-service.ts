"use client";

import { asolApi } from "@/core/api/asol-api-client";
import { ASOL_API_ROUTES } from "@/core/api/asol-api-routes";
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
    asolApi.get<TrendingRibbonPublished>(
      ASOL_API_ROUTES.advertisements.trendingRibbon,
    ),

  getVersion: () =>
    asolApi.get<TrendingRibbonVersion>(
      ASOL_API_ROUTES.advertisements.trendingRibbonVersion,
      { suppressErrorLog: true },
    ),

  getAdmin: (identity: { uid: string; phone: string }) => {
    const query = new URLSearchParams({
      admin: "1",
      uid: identity.uid,
      phone: identity.phone,
    });
    return asolApi.get<TrendingRibbonRecord>(
      `${ASOL_API_ROUTES.advertisements.trendingRibbon}?${query.toString()}`,
    );
  },

  save: (
    identity: { uid: string; phone: string },
    config: TrendingRibbonConfig,
    checkIntervalMinutes: number,
  ) =>
    asolApi.put<TrendingRibbonRecord>(
      ASOL_API_ROUTES.advertisements.trendingRibbon,
      { identity, config, checkIntervalMinutes },
    ),
};
