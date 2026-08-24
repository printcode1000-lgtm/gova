"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { NativeCore } from "@asol/native-core";
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

    void NativeCore.getLaunchUrl().then((res) => {
      if (res.ok && res.value) {
        navigate(res.value.url);
      }
    });

    void NativeCore.onAppUrlOpen(({ url }) => navigate(url)).then((res) => {
      if (res.ok) {
        if (disposed) res.value();
        else unsubscribe = res.value;
      }
    });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [router]);

  return null;
}
