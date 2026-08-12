"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { app } from "@/native-platform/app";
import { internalRouteFromPublicShareUrl } from "./share-links";

export function ShareDeepLinkController() {
  const router = useRouter();

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    const navigate = (url: string | undefined) => {
      if (!url || disposed) return;
      const route = internalRouteFromPublicShareUrl(url);
      if (route) router.replace(route);
    };

    void app.launchUrl().then((value) => navigate(value?.url));
    void app
      .onDeepLink(({ url }) => navigate(url))
      .then((remove) => {
        if (disposed) remove();
        else unsubscribe = remove;
      });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [router]);

  return null;
}
