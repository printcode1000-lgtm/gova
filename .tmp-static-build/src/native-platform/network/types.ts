/** Single responsibility: describe normalized network state and listeners. */
import type { Unsubscribe } from "../core/listener";
export interface NetworkState {
  connected: boolean;
  connectionType: string;
}
export type NetworkListener = (state: NetworkState) => void;
export type NetworkUnsubscribe = Unsubscribe;
