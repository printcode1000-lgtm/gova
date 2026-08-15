import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { appAdapter } from "../adapters/app.adapter";
import type { AppInfo, AppState, AppLaunchUrl } from "../domain/app/types";
import type { Unsubscribe } from "../domain/listener";

const MODULE = "App";

export const appApi = {
  async getAppInfo(): Promise<Result<AppInfo, NativeCoreError>> {
    try {
      const info = await appAdapter.getInfo();
      return ok(info);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async getAppState(): Promise<Result<AppState, NativeCoreError>> {
    try {
      const state = await appAdapter.getState();
      return ok(state);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async getLaunchUrl(): Promise<Result<AppLaunchUrl | null, NativeCoreError>> {
    try {
      const url = await appAdapter.getLaunchUrl();
      return ok(url);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async exitApp(): Promise<Result<void, NativeCoreError>> {
    try {
      await appAdapter.exitApp();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async minimizeApp(): Promise<Result<void, NativeCoreError>> {
    try {
      await appAdapter.minimizeApp();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onAppStateChange(
    listener: (state: AppState) => void,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      const unsub = await appAdapter.addListener("appStateChange", listener);
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onAppUrlOpen(
    listener: (data: { url: string }) => void,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      const unsub = await appAdapter.addListener("appUrlOpen", listener);
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onAppRestoredResult(
    listener: (data: unknown) => void,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      const unsub = await appAdapter.addListener("appRestoredResult", listener);
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
