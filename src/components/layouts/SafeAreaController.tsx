'use client';

import { useEffect } from 'react';

import { useResolvedColorScheme } from '@/lib/preferences';
import { NativeCore, isNativePlatform, type StatusBarInfo } from '@asol/native-core';
import { reportPreAuthFailure } from '@/features/system-logs/pre-auth-failure-reporter';

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

    const applyInset = (info: StatusBarInfo) => {
      // A hidden or non-overlaying status bar sits outside the WebView already,
      // so the web layer must not reserve any space for it.
      const height = info.visible && info.overlays ? info.height : 0;
      root.style.setProperty(STATUS_BAR_HEIGHT_VAR, `${height}px`);
    };

    const readInset = async (): Promise<void> => {
      try {
        const res = await NativeCore.getStatusBarInfo();
        if (!disposed && res.ok) applyInset(res.value);
      } catch (error) {
        reportPreAuthFailure('read-native-status-bar-inset', error, {}, 'warn');
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
      if (settleTimer !== null) clearTimeout(settleTimer);
      root.style.removeProperty(STATUS_BAR_HEIGHT_VAR);
    };
  }, []);

  useEffect(() => {
    if (!isNativePlatform()) return;
    // `dark` means light glyphs (for a dark background) and vice versa.
    void NativeCore.setStatusBarStyle({
      style: colorScheme === 'dark' ? 'dark' : 'light',
    }).then((res) => {
      if (!res.ok) {
        reportPreAuthFailure('set-native-status-bar-style', res.error, {}, 'warn');
      }
    });
  }, [colorScheme]);

  return null;
}
