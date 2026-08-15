import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { preferencesAdapter } from "../adapters/preferences.adapter";
import type { PreferenceGetResult, PreferenceKeysResult } from "../domain/preferences/types";

const MODULE = "Preferences";

export const preferencesApi = {
  async getPreference(key: string): Promise<Result<PreferenceGetResult, NativeCoreError>> {
    try {
      const res = await preferencesAdapter.get(key);
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async setPreference(key: string, value: string): Promise<Result<void, NativeCoreError>> {
    try {
      await preferencesAdapter.set(key, value);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async removePreference(key: string): Promise<Result<void, NativeCoreError>> {
    try {
      await preferencesAdapter.remove(key);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async clearPreferences(): Promise<Result<void, NativeCoreError>> {
    try {
      await preferencesAdapter.clear();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async getPreferenceKeys(): Promise<Result<PreferenceKeysResult, NativeCoreError>> {
    try {
      const res = await preferencesAdapter.keys();
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
