'use client';

import { useEffect } from 'react';

import { useResolvedColorScheme } from '@/lib/preferences';
import { isNativePlatform } from '@/native-platform/core/platform';
import { statusBar, type StatusBarInfo } from '@/native-platform/status-bar';

const STATUS_BAR_HEIGHT_VAR = '--asol-native-status-bar-height';

/** Android reports the new inset a beat after the rotation animation starts. */
const ROTATION_SETTLE_MS = 350;

/**
 * Single responsibility: keep the native system insets and the status-bar icon
 * style in sync with what the app is actually rendering.
 *
 * Mounted once at the root — not inside the app shell — so the inset is also
 * correct on the splash route and for any fixed overlay, and so it never
 * disappears while navigating between routes.
 */
export function SafeAreaController() {
  const colorScheme = useResolvedColorScheme();

  useEffect(() => {
    if (!isNativePlatform()) return;

    const root = document.documentElement;
    let disposed = false;
    let reading = false;
    let rereadPending = false;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: (() => void) | null = null;

    const applyInset = (info: StatusBarInfo) => {
      // A hidden or non-overlaying status bar sits outside the WebView already,
      // so the web layer must not reserve any space for it.
      const height = info.visible && info.overlays ? info.height : 0;
      root.style.setProperty(STATUS_BAR_HEIGHT_VAR, `${height}px`);
    };

    const readInset = async (): Promise<void> => {
      try {
        const info = await statusBar.getInfo();
        if (!disposed) applyInset(info);
      } catch {
        // Plugin unavailable: fall back to env(safe-area-inset-top) alone.
        if (!disposed) root.style.setProperty(STATUS_BAR_HEIGHT_VAR, '0px');
      }
    };

    /**
     * Collapse the bursts of events the keyboard and rotation produce into one
     * in-flight bridge call, plus a single trailing one for the final state.
     * Deliberately not `requestAnimationFrame`: that never fires while the
     * document is hidden, which is exactly when the app is being resumed.
     */
    const scheduleRead = () => {
      if (disposed) return;
      if (reading) {
        rereadPending = true;
        return;
      }
      reading = true;
      void readInset().finally(() => {
        reading = false;
        if (rereadPending && !disposed) {
          rereadPending = false;
          scheduleRead();
        }
      });
    };

    const handleRotation = () => {
      scheduleRead();
      if (settleTimer !== null) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        settleTimer = null;
        scheduleRead();
      }, ROTATION_SETTLE_MS);
    };

    const handleVisibility = () => {
      // The system bars can change while the app is backgrounded.
      if (document.visibilityState === 'visible') scheduleRead();
    };

    scheduleRead();

    // The plugin's own events are the only signal for a status bar that is
    // shown or hidden without any viewport resize.
    void statusBar
      .onChange((info) => {
        if (!disposed) applyInset(info);
      })
      .then((remove) => {
        if (disposed) remove();
        else unsubscribe = remove;
      })
      .catch(() => {
        // Listener support is optional; the polled reads still cover rotation.
      });

    const orientation = window.screen?.orientation;
    orientation?.addEventListener('change', handleRotation);
    window.addEventListener('orientationchange', handleRotation);
    window.addEventListener('resize', scheduleRead);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      orientation?.removeEventListener('change', handleRotation);
      window.removeEventListener('orientationchange', handleRotation);
      window.removeEventListener('resize', scheduleRead);
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubscribe?.();
      if (settleTimer !== null) clearTimeout(settleTimer);
      root.style.removeProperty(STATUS_BAR_HEIGHT_VAR);
    };
  }, []);

  useEffect(() => {
    if (!isNativePlatform()) return;
    // `dark` means light glyphs (for a dark background) and vice versa.
    void statusBar
      .setStyle(colorScheme === 'dark' ? 'dark' : 'light')
      .catch(() => {
        // Appearance is cosmetic; never break rendering over it.
      });
  }, [colorScheme]);

  return null;
}
