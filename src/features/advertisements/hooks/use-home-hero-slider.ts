"use client";

import { useCallback, useEffect, useState } from "react";

import fallbackSeed from "@/features/advertisements/config/home-hero-slider.seed.json";
import { GOVA_DB_STORES, govaDbGet, govaDbSet } from "@/lib/gova-db";
import type {
  HomeHeroConfig,
  HomeHeroPublished,
} from "../entities/home-hero-slider.entity";
import { homeHeroSliderApiService } from "../services/home-hero-slider-api-service";

const CACHE_KEY = "advertisements:home-hero-slider";

interface HomeHeroCache extends HomeHeroPublished {
  lastCheckedAt: string;
}

const fallback: HomeHeroPublished = {
  config: fallbackSeed.config as HomeHeroConfig,
  version: 0,
  checkIntervalMinutes: 15,
  publishedAt: "",
};

export function useHomeHeroSlider() {
  const [data, setData] = useState<HomeHeroPublished>(fallback);

  const checkForUpdates = useCallback(async (force = false) => {
    const cached = await govaDbGet<HomeHeroCache>(
      GOVA_DB_STORES.APP_SETTINGS,
      CACHE_KEY,
    );
    if (cached) setData(cached);

    const intervalMs = (cached?.checkIntervalMinutes ?? 15) * 60_000;
    const lastCheck = cached ? Date.parse(cached.lastCheckedAt) : 0;
    if (!force && Date.now() - lastCheck < intervalMs) return;

    try {
      const version = await homeHeroSliderApiService.getVersion();
      let next: HomeHeroPublished = cached ?? fallback;
      if (!cached || version.version > cached.version) {
        next = await homeHeroSliderApiService.getPublished();
        setData(next);
      } else if (version.checkIntervalMinutes !== cached.checkIntervalMinutes) {
        next = {
          ...cached,
          checkIntervalMinutes: version.checkIntervalMinutes,
        };
        setData(next);
      }
      await govaDbSet<HomeHeroCache>(GOVA_DB_STORES.APP_SETTINGS, CACHE_KEY, {
        ...next,
        lastCheckedAt: new Date().toISOString(),
      });
    } catch {
      // Offline and transient failures keep the last known local version visible.
    }
  }, []);

  useEffect(() => {
    void checkForUpdates();
    const interval = window.setInterval(() => void checkForUpdates(), 60_000);
    return () => window.clearInterval(interval);
  }, [checkForUpdates]);

  return { ...data, checkForUpdates };
}
