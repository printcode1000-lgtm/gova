import { App } from "@capacitor/app";
import { createLazyPlugin, sanitizePlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { AppInfo, AppState, AppLaunchUrl, AppRestoredResult } from "../domain/app/types";
import type { Unsubscribe } from "../domain/listener";

const MODULE = "App";

const appPlugin = createLazyPlugin(MODULE, async () => {
  return sanitizePlugin(App);
});


export const appAdapter = {
  async getInfo(): Promise<AppInfo> {
    try {
      const plugin = await appPlugin.required();
      const info = await plugin.getInfo();
      return {
        name: info.name,
        id: info.id,
        build: info.build,
        version: info.version,
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async getState(): Promise<AppState> {
    try {
      const plugin = await appPlugin.required();
      const state = await plugin.getState();
      return { isActive: state.isActive };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async getLaunchUrl(): Promise<AppLaunchUrl | null> {
    try {
      const plugin = await appPlugin.required();
      const launch = await plugin.getLaunchUrl();
      return launch ? { url: launch.url } : null;
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async exitApp(): Promise<void> {
    try {
      const plugin = await appPlugin.required();
      await plugin.exitApp();
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async minimizeApp(): Promise<void> {
    try {
      const plugin = await appPlugin.required();
      await plugin.minimizeApp();
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async addListener(
    eventName: "appStateChange" | "appUrlOpen" | "appRestoredResult" | "backButton",
    listener: (data: any) => void,
  ): Promise<Unsubscribe> {
    try {
      const plugin = await appPlugin.required();
      const handle = await plugin.addListener(eventName as any, listener);
      return () => {
        void handle.remove();
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
  async onStateChange(listener: (state: AppState) => void): Promise<Unsubscribe> {
    return this.addListener("appStateChange", listener);
  },
};

export const app = appAdapter;
