export interface DeviceInfo {
  model: string;
  platform: "android" | "ios" | "web";
  operatingSystem: "android" | "ios" | "windows" | "mac" | "linux" | "unknown";
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
  memUsed?: number;
  realDiskFree?: number;
  realDiskTotal?: number;
  webViewVersion: string;
}

export interface DeviceBatteryInfo {
  batteryLevel?: number;
  isCharging?: boolean;
}

export interface DeviceId {
  identifier: string;
}
