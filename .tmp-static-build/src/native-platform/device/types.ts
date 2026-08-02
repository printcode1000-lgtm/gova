/** Single responsibility: describe privacy-conscious normalized device data. */
export interface DeviceInfo {
  platform: string;
  operatingSystem: string;
  osVersion: string;
  model: string;
  manufacturer: string;
  isVirtual: boolean;
}
export interface DeviceId {
  identifier: string;
}
