/** Single responsibility: persist small non-sensitive preferences consistently. */
import {
  getNativePreference,
  removeNativePreference,
  setNativePreference,
} from "./preferences-native-adapter";
import type { PreferenceValue } from "./types";
export class PreferencesModule {
  async get(key: string): Promise<PreferenceValue> {
    return getNativePreference(key);
  }
  async set(key: string, value: string): Promise<void> {
    await setNativePreference(key, value);
  }
  async remove(key: string): Promise<void> {
    await removeNativePreference(key);
  }
}
export const preferences = new PreferencesModule();
