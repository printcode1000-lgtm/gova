import { App, type BackButtonListenerEvent } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';

export const capacitorBackButtonAdapter = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  async subscribe(listener: (event: BackButtonListenerEvent) => void): Promise<PluginListenerHandle> {
    return App.addListener('backButton', listener);
  },

  exitApp(): Promise<void> {
    return App.exitApp();
  },
};
