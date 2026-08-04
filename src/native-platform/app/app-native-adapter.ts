/** Single responsibility: lazily bridge application lifecycle to `@capacitor/app`. */
import { toNativeError } from "../core/errors";
import { createLazyPlugin } from "../core/lazy-plugin";
import type {
  AppDeepLinkListener,
  AppInfo,
  AppStateListener,
  AppUnsubscribe,
} from "./types";

const plugin = createLazyPlugin(
  "App",
  // The namespace is inert; returning the plugin proxy directly would make the
  // promise adopt it and call then() on the native bridge.
  async () => await import("@capacitor/app"),
);

export async function nativeAppInfo(): Promise<AppInfo> {
  try {
    const { name, id, version, build } = await (
      await plugin.required()
    ).App.getInfo();
    return { name, id, version, build };
  } catch (error) {
    throw toNativeError("App", error);
  }
}

export async function nativeAppIsActive(): Promise<boolean> {
  try {
    return (await (await plugin.required()).App.getState()).isActive;
  } catch (error) {
    throw toNativeError("App", error);
  }
}

export async function listenNativeAppState(
  listener: AppStateListener,
): Promise<AppUnsubscribe> {
  try {
    const handle = await (
      await plugin.required()
    ).App.addListener("appStateChange", ({ isActive }) =>
      listener({ isActive }),
    );
    return () => void handle.remove();
  } catch (error) {
    throw toNativeError("App", error);
  }
}

export async function listenNativeAppDeepLink(
  listener: AppDeepLinkListener,
): Promise<AppUnsubscribe> {
  try {
    const handle = await (
      await plugin.required()
    ).App.addListener("appUrlOpen", ({ url }) => listener({ url }));
    return () => void handle.remove();
  } catch (error) {
    throw toNativeError("App", error);
  }
}

export async function nativeAppExit(): Promise<void> {
  try {
    await (await plugin.required()).App.exitApp();
  } catch (error) {
    throw toNativeError("App", error);
  }
}
