'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { capacitorBackButtonAdapter } from '@/platform/navigation/capacitor-back-button-adapter';

const HOME_ROUTE = '/home';
const EXIT_CONFIRMATION_WINDOW_MS = 2_000;

export function useMobileBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [showExitHint, setShowExitHint] = useState(false);
  const lastExitPress = useRef(0);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!capacitorBackButtonAdapter.isAvailable()) return;

    let disposed = false;
    let removeListener: (() => Promise<void>) | null = null;

    void capacitorBackButtonAdapter.subscribe((event) => {
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
        void capacitorBackButtonAdapter.exitApp();
        return;
      }

      lastExitPress.current = now;
      setShowExitHint(true);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => {
        setShowExitHint(false);
        lastExitPress.current = 0;
      }, EXIT_CONFIRMATION_WINDOW_MS);
    }).then((handle) => {
      if (disposed) void handle.remove();
      else removeListener = () => handle.remove();
    });

    return () => {
      disposed = true;
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      if (removeListener) void removeListener();
    };
  }, [pathname, router]);

  return { showExitHint };
}
