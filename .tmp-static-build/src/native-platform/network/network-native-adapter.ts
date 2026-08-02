/** Single responsibility: lazily bridge network status and change events. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type {
  NetworkListener,
  NetworkState,
  NetworkUnsubscribe,
} from "./types";
const plugin = createLazyPlugin(
  "Network",
  async () => (await import("@capacitor/network")).Network,
);
export async function nativeNetworkStatus(): Promise<NetworkState> {
  try {
    return await (await plugin.required()).getStatus();
  } catch (error) {
    throw toNativeError("Network", error);
  }
}
export async function listenNativeNetwork(
  listener: NetworkListener,
): Promise<NetworkUnsubscribe> {
  try {
    const handle = await (
      await plugin.required()
    ).addListener("networkStatusChange", listener);
    return () => handle.remove();
  } catch (error) {
    throw toNativeError("Network", error);
  }
}
