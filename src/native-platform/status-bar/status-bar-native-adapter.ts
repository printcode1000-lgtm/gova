/** Single responsibility: lazily bridge status-bar appearance to Capacitor. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { StatusBarInfo, StatusBarStyleName } from "./types";
const plugin = createLazyPlugin(
  "StatusBar",
  async () => await import("@capacitor/status-bar"),
);
export async function setNativeStatusBarStyle(
  style: StatusBarStyleName,
): Promise<void> {
  try {
    const p = await plugin.required();
    const values = {
      dark: p.Style.Dark,
      light: p.Style.Light,
      default: p.Style.Default,
    };
    await p.StatusBar.setStyle({ style: values[style] });
  } catch (error) {
    throw toNativeError("StatusBar", error);
  }
}
export async function setNativeStatusBarVisible(
  visible: boolean,
): Promise<void> {
  try {
    const p = (await plugin.required()).StatusBar;
    if (visible) await p.show();
    else await p.hide();
  } catch (error) {
    throw toNativeError("StatusBar", error);
  }
}
export async function setNativeStatusBarColor(color: string): Promise<void> {
  try {
    await (await plugin.required()).StatusBar.setBackgroundColor({ color });
  } catch (error) {
    throw toNativeError("StatusBar", error);
  }
}

function toStatusBarInfo(info: {
  height: number;
  overlays: boolean;
  visible: boolean;
}): StatusBarInfo {
  return {
    // Older Android WebViews may omit the height; treat it as "no inset".
    height: Number.isFinite(info.height) ? Math.max(0, info.height) : 0,
    overlays: info.overlays,
    visible: info.visible,
  };
}

export async function getNativeStatusBarInfo(): Promise<StatusBarInfo> {
  try {
    return toStatusBarInfo(await (await plugin.required()).StatusBar.getInfo());
  } catch (error) {
    throw toNativeError("StatusBar", error);
  }
}

/**
 * Subscribe to the plugin's own change events (visibility / overlay), which are
 * the only reliable signal for a status bar that appears or disappears without
 * a viewport resize. Resolves to an unsubscribe function.
 */
export async function addNativeStatusBarChangeListener(
  onChange: (info: StatusBarInfo) => void,
): Promise<() => void> {
  try {
    const p = (await plugin.required()).StatusBar;
    const notify = (info: StatusBarInfo) => onChange(toStatusBarInfo(info));
    const handles = await Promise.all([
      p.addListener("statusBarVisibilityChanged", notify),
      p.addListener("statusBarOverlayChanged", notify),
    ]);
    return () => {
      for (const handle of handles) void handle.remove();
    };
  } catch (error) {
    throw toNativeError("StatusBar", error);
  }
}
