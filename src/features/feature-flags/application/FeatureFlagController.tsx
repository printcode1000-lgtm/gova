"use client";

import { useEffect } from "react";
import { NativeCore } from "@asol/native-core";
import { featureFlags } from "./feature-flag-service";
import { featureFlagApiService } from "./services/feature-flag-api-service";

/** How long a fetched flag set is trusted before the next refresh. */
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Single responsibility: keep the flag service supplied with live values.
 *
 * Mounted once, high in the tree, and deliberately silent: a failed refresh
 * leaves the last known values in place. That is the safe direction — a device
 * that cannot reach the server keeps behaving as it did a moment ago instead of
 * flipping every feature to its default.
 *
 * It refreshes on mount, on an interval, and whenever the application returns
 * to the foreground, because that is when a user is most likely to be looking
 * at a feature that was withdrawn while they were away.
 */
export function FeatureFlagController() {
  useEffect(() => {
    let cancelled = false;

    featureFlags.configureRemoteProvider(async () =>
      featureFlagApiService.getValues(),
    );

    const refresh = () => {
      if (cancelled) return;
      void featureFlags.refresh().catch(() => {
        // Offline or server error: keep the last known-good values.
      });
    };

    refresh();
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);

    let unsubscribe: (() => void) | undefined;
    void NativeCore.onAppStateChange(({ isActive }) => {
      if (isActive) refresh();
    })
      .then((res) => {
        if (res.ok) {
          if (cancelled) res.value();
          else unsubscribe = res.value;
        }
      })
      .catch(() => {
        // Lifecycle events are an optimisation, never a requirement.
      });

    return () => {
      cancelled = true;
      clearInterval(timer);
      unsubscribe?.();
    };
  }, []);

  return null;
}
