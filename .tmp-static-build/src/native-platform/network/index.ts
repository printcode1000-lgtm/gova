/** Single responsibility: expose the network module. */
export { network, NetworkModule } from "./network";
export type {
  NetworkListener,
  NetworkState,
  NetworkUnsubscribe,
} from "./types";
