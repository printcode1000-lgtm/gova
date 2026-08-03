/** Single responsibility: lazily bridge key-value preferences to Capacitor. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { PreferenceValue } from "./types";
const plugin = createLazyPlugin(
  "Preferences",
  // The namespace is inert; returning the plugin proxy here would make the
  // promise adopt it and call then() on the native bridge.
  async () => await import("@capacitor/preferences"),
);
export async function getNativePreference(
  key: string,
): Promise<PreferenceValue> {
  try {
    return await (await plugin.required()).Preferences.get({ key });
  } catch (error) {
    throw toNativeError("Preferences", error);
  }
}
export async function setNativePreference(
  key: string,
  value: string,
): Promise<void> {
  try {
    await (await plugin.required()).Preferences.set({ key, value });
  } catch (error) {
    throw toNativeError("Preferences", error);
  }
}
export async function removeNativePreference(key: string): Promise<void> {
  try {
    await (await plugin.required()).Preferences.remove({ key });
  } catch (error) {
    throw toNativeError("Preferences", error);
  }
}
