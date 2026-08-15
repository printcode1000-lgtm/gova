import { StatusBar, Style as CapStyle, Animation as CapAnimation } from "@capacitor/status-bar";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { SetStatusBarAnimationOptions, SetStatusBarBackgroundColorOptions, SetStatusBarStyleOptions, StatusBarInfo, StatusBarStyle } from "../domain/status-bar/types";
import type { Unsubscribe } from "../domain/listener";

const MODULE = "StatusBar";

const statusBarPlugin = createLazyPlugin(MODULE, async () => {
  return StatusBar;
});

export const statusBarAdapter = {
  async setStyle(options: SetStatusBarStyleOptions | StatusBarStyle): Promise<void> {
    try {
      const plugin = await statusBarPlugin.required();
      const styleName = typeof options === "string" ? options : options.style;
      let style = CapStyle.Default;
      if (styleName === "dark") style = CapStyle.Dark;
      else if (styleName === "light") style = CapStyle.Light;
      await plugin.setStyle({ style });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async setBackgroundColor(options: SetStatusBarBackgroundColorOptions): Promise<void> {
    try {
      const plugin = await statusBarPlugin.required();
      await plugin.setBackgroundColor({ color: options.color });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async show(options?: SetStatusBarAnimationOptions): Promise<void> {
    try {
      const plugin = await statusBarPlugin.required();
      let animation = CapAnimation.None;
      if (options?.animation === "slide") animation = CapAnimation.Slide;
      else if (options?.animation === "fade") animation = CapAnimation.Fade;
      await plugin.show({ animation });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async hide(options?: SetStatusBarAnimationOptions): Promise<void> {
    try {
      const plugin = await statusBarPlugin.required();
      let animation = CapAnimation.None;
      if (options?.animation === "slide") animation = CapAnimation.Slide;
      else if (options?.animation === "fade") animation = CapAnimation.Fade;
      await plugin.hide({ animation });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async getInfo(): Promise<StatusBarInfo> {
    try {
      const plugin = await statusBarPlugin.required();
      const info = await plugin.getInfo();
      let style: StatusBarStyle = "default";
      if (info.style === CapStyle.Dark) style = "dark";
      else if (info.style === CapStyle.Light) style = "light";
      return {
        visible: info.visible,
        style,
        color: (info as any).color,
        overlays: info.overlays,
        height: (info as any).height ?? (info.visible ? 24 : 0),
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async setOverlaysWebView(overlay: boolean): Promise<void> {
    try {
      const plugin = await statusBarPlugin.required();
      await plugin.setOverlaysWebView({ overlay });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async onChange(listener: (info: StatusBarInfo) => void): Promise<Unsubscribe> {
    try {
      const plugin = await statusBarPlugin.required();
      const handle = await plugin.addListener("statusTap" as any, async () => {
        const info = await this.getInfo();
        listener(info);
      });
      return () => {
        void handle.remove();
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};

export const statusBar = statusBarAdapter;
