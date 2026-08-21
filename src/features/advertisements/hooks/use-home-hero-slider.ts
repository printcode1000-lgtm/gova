"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ASOL_DB_STORES,
  asolDbDelete,
  asolDbGet,
  asolDbSet,
} from "@asol/data-core/browser";
import {
  DEFAULT_HOME_HERO_PUBLISHED,
  HOME_HERO_CACHE_KEY,
  HOME_HERO_LEGACY_CACHE_KEY,
  type HomeHeroConfig,
  type HomeHeroPublished,
} from "@asol/hero-slider-core";
import { homeHeroSliderApiService } from "../services/home-hero-slider-api-service";
import { reportSystemIssue } from '@asol/system-logs-core';

interface HomeHeroCache extends HomeHeroPublished {
  lastCheckedAt: string;
}

const fallback: HomeHeroPublished = {
  ...DEFAULT_HOME_HERO_PUBLISHED,
  config: DEFAULT_HOME_HERO_PUBLISHED.config satisfies HomeHeroConfig,
};

export function useHomeHeroSlider() {
  const [data, setData] = useState<HomeHeroPublished>(fallback);

  const checkForUpdates = useCallback(async (force = false) => {
    try {
      const cached = await asolDbGet<HomeHeroCache>(
        ASOL_DB_STORES.APP_SETTINGS,
        HOME_HERO_CACHE_KEY,
      );
      await asolDbDelete(ASOL_DB_STORES.APP_SETTINGS, HOME_HERO_LEGACY_CACHE_KEY);
      if (cached) setData(cached);

      const intervalMs = (cached?.checkIntervalMinutes ?? 15) * 60_000;
      const lastCheck = cached ? Date.parse(cached.lastCheckedAt) : 0;
      if (!force && Date.now() - lastCheck < intervalMs) return;

      const version = await homeHeroSliderApiService.getVersion();
      let next: HomeHeroPublished = cached ?? fallback;
      if (
        !cached ||
        version.version !== cached.version ||
        version.updatedAt !== cached.updatedAt
      ) {
        next = await homeHeroSliderApiService.getCurrent();
        setData(next);
      } else if (version.checkIntervalMinutes !== cached.checkIntervalMinutes) {
        next = {
          ...cached,
          checkIntervalMinutes: version.checkIntervalMinutes,
        };
        setData(next);
      }
      await asolDbSet<HomeHeroCache>(
        ASOL_DB_STORES.APP_SETTINGS,
        HOME_HERO_CACHE_KEY,
        {
          ...next,
          lastCheckedAt: new Date().toISOString(),
        },
      );
    } catch (error) {
      // Offline and transient failures keep the last known local version visible.
      reportSystemIssue({
        level: "warning",
        feature: "Home",
        operation: "sync-hero-slider",
        error,
        page: "/home",
      });
    }
  }, []);

  useEffect(() => {
    void checkForUpdates();
    const interval = window.setInterval(() => void checkForUpdates(), 60_000);
    return () => window.clearInterval(interval);
  }, [checkForUpdates]);

  return { ...data, checkForUpdates };
}
