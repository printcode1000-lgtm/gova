"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { NativeCore, isNativePlatform } from "@asol/native-core";

const HOME_ROUTE = "/home";
const EXIT_CONFIRMATION_WINDOW_MS = 2_000;

export function useMobileBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [showExitHint, setShowExitHint] = useState(false);
  const lastExitPress = useRef(0);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!isNativePlatform()) return;

    let disposed = false;
    let removeListener: (() => void) | null = null;

    void NativeCore.onBackButton((event: { canGoBack: boolean }) => {
      if (event.canGoBack) {
        setShowExitHint(false);
        lastExitPress.current = 0;
        window.history.back();
        return;
      }

      if (pathname !== HOME_ROUTE) {
        setShowExitHint(false);
        lastExitPress.current = 0;
        router.replace(HOME_ROUTE);
        return;
      }

      const now = Date.now();
      if (now - lastExitPress.current <= EXIT_CONFIRMATION_WINDOW_MS) {
        void NativeCore.exitApp();
        return;
      }

      lastExitPress.current = now;
      setShowExitHint(true);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => {
        setShowExitHint(false);
        lastExitPress.current = 0;
      }, EXIT_CONFIRMATION_WINDOW_MS);
    }).then((res) => {
      if (res.ok) {
        if (disposed) void res.value();
        else removeListener = res.value;
      }
    });

    return () => {
      disposed = true;
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      if (removeListener) void removeListener();
    };
  }, [pathname, router]);

  return { showExitHint };
}
