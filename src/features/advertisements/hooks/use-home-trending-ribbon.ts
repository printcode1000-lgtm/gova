"use client";

import { useCallback, useEffect, useState } from "react";

import type { TrendingRibbonConfig as UIRibbonConfig } from "@/components/ui/TrendingRibbon";
import {
  TRENDING_RIBBON_CACHE_KEY,
  type TrendingRibbonPublished,
} from "@/features/advertisements/entities/trending-ribbon.entity";
import { trendingRibbonApiService } from "@/features/advertisements/services/trending-ribbon-api-service";
import { reportSystemIssue } from "@/features/system-logs/report-system-issue";
import {
  ASOL_DB_STORES,
  asolDbDelete,
  asolDbGet,
  asolDbSet,
} from "@/lib/asol-db";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrendingRibbonCache extends TrendingRibbonPublished {
  lastCheckedAt: string;
}

interface HomeTrendingRibbonState {
  config: UIRibbonConfig;
  isLoading: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_LABEL = "home.trending.label";

const fallback: TrendingRibbonPublished = {
  config: { label: FALLBACK_LABEL, items: [] },
  version: 0,
  checkIntervalMinutes: 15,
  updatedAt: "",
};

function isValidTrendingConfig(value: unknown): value is UIRibbonConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<UIRibbonConfig>;
  return (
    typeof config.label === "string" &&
    Array.isArray(config.items) &&
    config.items.every(
      (item) =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof item.label === "string" &&
        typeof item.action === "string",
    )
  );
}

function isValidPublished(value: unknown): value is TrendingRibbonPublished {
  if (!value || typeof value !== "object") return false;
  const published = value as Partial<TrendingRibbonPublished>;
  return (
    isValidTrendingConfig(published.config) &&
    typeof published.version === "number" &&
    typeof published.checkIntervalMinutes === "number" &&
    typeof published.updatedAt === "string"
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHomeTrendingRibbon() {
  const [state, setState] = useState<HomeTrendingRibbonState>({
    config: { label: FALLBACK_LABEL, items: [] },
    isLoading: true,
  });

  const checkForUpdates = useCallback(async (force = false) => {
    try {
      const stored = await asolDbGet<TrendingRibbonCache>(
        ASOL_DB_STORES.APP_SETTINGS,
        TRENDING_RIBBON_CACHE_KEY,
      );
      const cached = isValidPublished(stored) ? stored : null;

      if (stored && !cached) {
        await asolDbDelete(
          ASOL_DB_STORES.APP_SETTINGS,
          TRENDING_RIBBON_CACHE_KEY,
        );
      }

      // Show cached data immediately to avoid flicker
      if (cached) {
        setState({ config: cached.config, isLoading: false });
      }

      // Skip server check if within interval window
      const intervalMs = (cached?.checkIntervalMinutes ?? 15) * 60_000;
      const lastCheck = cached ? Date.parse(cached.lastCheckedAt) : 0;
      if (!force && Date.now() - lastCheck < intervalMs) return;

      // Lightweight version check
      const version = await trendingRibbonApiService.getVersion();
      let next: TrendingRibbonPublished = cached ?? fallback;

      if (
        !cached ||
        version.version !== cached.version ||
        version.updatedAt !== cached.updatedAt
      ) {
        // Config changed — download full data
        const remote = await trendingRibbonApiService.getCurrent();
        if (!isValidPublished(remote)) {
          throw new Error("Trending ribbon API returned an invalid payload");
        }
        next = remote;
        setState({ config: next.config, isLoading: false });
      } else if (version.checkIntervalMinutes !== cached.checkIntervalMinutes) {
        // Only interval changed
        next = { ...cached, checkIntervalMinutes: version.checkIntervalMinutes };
      }

      // Persist updated cache
      await asolDbSet<TrendingRibbonCache>(
        ASOL_DB_STORES.APP_SETTINGS,
        TRENDING_RIBBON_CACHE_KEY,
        { ...next, lastCheckedAt: new Date().toISOString() },
      );
    } catch (error) {
      reportSystemIssue({
        level: "warning",
        feature: "Home",
        operation: "sync-trending-ribbon",
        error,
        page: "/home",
      });
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    void checkForUpdates();
    // Re-check every minute — actual fetch is skipped when within interval window
    const timer = window.setInterval(() => void checkForUpdates(), 60_000);
    return () => window.clearInterval(timer);
  }, [checkForUpdates]);

  return { ...state, checkForUpdates };
}
