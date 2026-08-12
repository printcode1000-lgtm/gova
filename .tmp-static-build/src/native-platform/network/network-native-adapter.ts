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
  // The namespace is inert; returning the plugin proxy here would make the
  // promise adopt it and call then() on the native bridge.
  async () => await import("@capacitor/network"),
);
export async function nativeNetworkStatus(): Promise<NetworkState> {
  try {
    return await (await plugin.required()).Network.getStatus();
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
    ).Network.addListener("networkStatusChange", listener);
    return () => handle.remove();
  } catch (error) {
    throw toNativeError("Network", error);
  }
}
