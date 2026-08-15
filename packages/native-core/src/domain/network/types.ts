export type ConnectionType =
  | "wifi"
  | "cellular"
  | "none"
  | "unknown";

export interface NetworkStatus {
  connected: boolean;
  connectionType: ConnectionType;
}
