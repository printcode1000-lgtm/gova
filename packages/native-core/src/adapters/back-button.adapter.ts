import { appAdapter } from "./app.adapter";
import { isAndroid, isNativePlatform } from "./platform.adapter";
import type { BackButtonEvent, BackButtonListener } from "../domain/navigation/types";
import type { Unsubscribe } from "../domain/listener";

export const backButtonAdapter = {
  isAvailable(): boolean {
    return isNativePlatform() && isAndroid();
  },

  async subscribe(listener: BackButtonListener): Promise<Unsubscribe> {
    if (!this.isAvailable()) {
      return () => {};
    }
    return appAdapter.addListener("backButton", (event: { canGoBack: boolean }) => {
      listener({ canGoBack: Boolean(event?.canGoBack) });
    });
  },

  async exitApp(): Promise<void> {
    if (!this.isAvailable()) return;
    await appAdapter.exitApp();
  },
};
