/**
 * The single entry point for every native permission in the application.
 *
 * Single responsibility: decide *whether* to prompt and report a unified
 * result. It never talks to a plugin directly — `permission-adapters.ts`
 * owns that — and it never performs the guarded operation itself.
 *
 * No page, component, hook, or feature service may bypass this manager.
 */

import { createLazyPlugin } from "../core/lazy-plugin";
import { isAndroid, isIos, isNativePlatform } from "../core/platform";
import {
  localNotificationAdapter,
  resolveAdapter,
} from "./permission-adapters";
import {
  PermissionStates,
  toPermissionResult,
  type PermissionKind,
  type PermissionResult,
} from "./types";

interface NativeSettingsPlugin {
  openSettings: (options?: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Opening the OS settings screen is provided by the App plugin on Android and
 * by a URL scheme on iOS; both are optional and degrade to `false`.
 */
const appPlugin = createLazyPlugin("AppSettings", async () => {
  const { App } = await import("@capacitor/app");
  // Boxed: returning the proxy itself would make this promise call its
  // then() on the native bridge.
  return { plugin: App as unknown as NativeSettingsPlugin & Record<string, unknown> };
});

export class PermissionManager {
  /** Current state without ever showing a system prompt. */
  async check(kind: PermissionKind): Promise<PermissionResult> {
    const state = await resolveAdapter(kind).check();
    return toPermissionResult(kind, state);
  }

  /** Always asks the platform, even if previously denied. */
  async request(kind: PermissionKind): Promise<PermissionResult> {
    const state = await resolveAdapter(kind).request();
    return toPermissionResult(kind, state);
  }

  /**
   * The method callers should normally use: prompt only when it can help.
   *
   * Already granted -> returns immediately.
   * Permanently denied -> reports `Blocked` without a pointless prompt.
   */
  async requestIfNeeded(kind: PermissionKind): Promise<PermissionResult> {
    const adapter = resolveAdapter(kind);
    const current = await adapter.check();

    if (current === PermissionStates.Granted) {
      return toPermissionResult(kind, current);
    }
    if (current === PermissionStates.Unsupported) {
      return toPermissionResult(kind, current);
    }

    const next = await adapter.request();

    // A denial that survives an explicit request means the OS will not ask
    // again in this install; surface it as Blocked so the UI can offer
    // "open settings" instead of a button that silently does nothing.
    if (next === PermissionStates.Denied && current === PermissionStates.Denied) {
      return toPermissionResult(kind, PermissionStates.Blocked);
    }
    return toPermissionResult(kind, next);
  }

  /** Check several permissions at once, in parallel. */
  async checkAll(
    kinds: PermissionKind[],
  ): Promise<Record<string, PermissionResult>> {
    const results = await Promise.all(kinds.map((kind) => this.check(kind)));
    return Object.fromEntries(results.map((result) => [result.kind, result]));
  }

  /** True only when every requested permission ends up granted. */
  async requestAllIfNeeded(kinds: PermissionKind[]): Promise<boolean> {
    for (const kind of kinds) {
      const result = await this.requestIfNeeded(kind);
      if (!result.granted) return false;
    }
    return true;
  }

  /** Local notifications use their own OS permission on Android 13+. */
  async requestLocalNotificationsIfNeeded(): Promise<PermissionResult> {
    const adapter = localNotificationAdapter();
    const current = await adapter.check();
    if (
      current === PermissionStates.Granted ||
      current === PermissionStates.Unsupported
    ) {
      return toPermissionResult("notifications", current);
    }
    return toPermissionResult("notifications", await adapter.request());
  }

  /**
   * Open the application settings screen.
   * @returns `false` when the platform offers no way to do this.
   */
  async openSettings(): Promise<boolean> {
    if (!isNativePlatform()) return false;

    const app = (await appPlugin.optional())?.plugin ?? null;
    if (!app) return false;

    try {
      if (isAndroid() && typeof app.openSettings === "function") {
        await app.openSettings();
        return true;
      }
      if (isIos()) {
        // iOS exposes the app settings page through a URL scheme.
        const openUrl = (app as unknown as {
          openUrl?: (options: { url: string }) => Promise<unknown>;
        }).openUrl;
        if (typeof openUrl === "function") {
          await openUrl({ url: "app-settings:" });
          return true;
        }
      }
    } catch (error) {
      console.warn("[NativePlatform:Permissions] openSettings failed.", error);
    }
    return false;
  }
}

export const permissionManager = new PermissionManager();
