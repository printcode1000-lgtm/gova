import { Preferences } from "@capacitor/preferences";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { PreferenceGetResult, PreferenceKeysResult } from "../domain/preferences/types";

const MODULE = "Preferences";

const preferencesPlugin = createLazyPlugin(MODULE, async () => {
  return Preferences;
});

export const preferencesAdapter = {
  async get(key: string): Promise<PreferenceGetResult> {
    try {
      const plugin = await preferencesPlugin.required();
      const result = await plugin.get({ key });
      return { value: result.value };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      const plugin = await preferencesPlugin.required();
      await plugin.set({ key, value });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      const plugin = await preferencesPlugin.required();
      await plugin.remove({ key });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async clear(): Promise<void> {
    try {
      const plugin = await preferencesPlugin.required();
      await plugin.clear();
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async keys(): Promise<PreferenceKeysResult> {
    try {
      const plugin = await preferencesPlugin.required();
      const result = await plugin.keys();
      return { keys: result.keys };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
