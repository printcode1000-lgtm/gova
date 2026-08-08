/**
 * Single responsibility: expose application lifecycle without leaking the
 * plugin.
 *
 * The web half is deliberately real rather than a stub: `visibilitychange`
 * carries the same meaning as `appStateChange`, and the bundled manifest
 * carries the same version the shell reports. Only `exit` and deep links have
 * no browser equivalent — a browser tab is closed by the user, and a web
 * deployment receives its URL through normal navigation.
 */
import { NativePlatformError } from "../core/errors";
import { hasDom, isAndroid, isNativePlatform } from "../core/platform";
import { publicEnv } from "@/core/config/public-env";
import {
  listenNativeAppDeepLink,
  listenNativeAppState,
  nativeAppExit,
  nativeAppInfo,
  nativeAppIsActive,
  nativeAppLaunchUrl,
} from "./app-native-adapter";
import type {
  AppDeepLinkListener,
  AppDeepLink,
  AppInfo,
  AppState,
  AppStateListener,
  AppUnsubscribe,
} from "./types";

export class AppModule {
  /** Identity and version of the running container. */
  async info(): Promise<AppInfo> {
    if (isNativePlatform()) return nativeAppInfo();
    return {
      name: "ASOL",
      id: "hgh.asol.app",
      version: publicEnv.webBundleVersion,
      build: publicEnv.webBundleVersion,
    };
  }

  /** Whether the application is currently in the foreground. */
  async state(): Promise<AppState> {
    if (isNativePlatform()) return { isActive: await nativeAppIsActive() };
    return {
      isActive: hasDom() ? document.visibilityState === "visible" : true,
    };
  }

  async onStateChange(listener: AppStateListener): Promise<AppUnsubscribe> {
    if (isNativePlatform()) return listenNativeAppState(listener);
    if (!hasDom()) return () => {};
    const notify = () =>
      listener({ isActive: document.visibilityState === "visible" });
    document.addEventListener("visibilitychange", notify);
    return () => document.removeEventListener("visibilitychange", notify);
  }

  /**
   * URLs the OS hands to the application: custom scheme and app links.
   * The browser has no equivalent event, so the web path never fires.
   */
  async onDeepLink(listener: AppDeepLinkListener): Promise<AppUnsubscribe> {
    if (isNativePlatform()) return listenNativeAppDeepLink(listener);
    return () => {};
  }

  /** URL that cold-launched the native container, when one exists. */
  async launchUrl(): Promise<AppDeepLink | undefined> {
    if (isNativePlatform()) return nativeAppLaunchUrl();
    return undefined;
  }

  /**
   * Android only, and by OS policy. iOS treats a programmatic exit as a crash
   * and rejects it in review, so this reports `Unavailable` there rather than
   * pretending to work.
   */
  async exit(): Promise<void> {
    if (!isAndroid()) {
      throw NativePlatformError.unavailable(
        "App",
        "Exiting the application programmatically is supported on Android only.",
      );
    }
    await nativeAppExit();
  }

  /** True when `exit()` can do anything on this platform. */
  canExit(): boolean {
    return isAndroid();
  }
}

export const app = new AppModule();
