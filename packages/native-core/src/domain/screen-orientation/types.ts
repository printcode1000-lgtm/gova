export type OrientationType =
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary";

export type OrientationLockType =
  | "any"
  | "natural"
  | "landscape"
  | "portrait"
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary";

export interface ScreenOrientationResult {
  type: OrientationType;
}

export interface LockOrientationOptions {
  orientation: OrientationLockType;
}
