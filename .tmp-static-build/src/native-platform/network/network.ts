/** Single responsibility: expose current connectivity and change events. */
import { isNativePlatform } from "../core/platform";
import {
  listenNativeNetwork,
  nativeNetworkStatus,
} from "./network-native-adapter";
import type {
  NetworkListener,
  NetworkState,
  NetworkUnsubscribe,
} from "./types";
function webState(): NetworkState {
  return {
    connected: navigator.onLine,
    connectionType: navigator.onLine ? "unknown" : "none",
  };
}
export class NetworkModule {
  async getStatus(): Promise<NetworkState> {
    return isNativePlatform() ? nativeNetworkStatus() : webState();
  }
  async addListener(listener: NetworkListener): Promise<NetworkUnsubscribe> {
    if (isNativePlatform()) return listenNativeNetwork(listener);
    const notify = () => listener(webState());
    window.addEventListener("online", notify);
    window.addEventListener("offline", notify);
    return () => {
      window.removeEventListener("online", notify);
      window.removeEventListener("offline", notify);
    };
  }
}
export const network = new NetworkModule();
