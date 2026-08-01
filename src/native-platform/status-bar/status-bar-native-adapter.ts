/** Single responsibility: lazily bridge status-bar appearance to Capacitor. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { StatusBarStyleName } from "./types";
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
