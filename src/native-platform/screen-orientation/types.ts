/** Single responsibility: describe normalized screen orientations. */
export type ScreenOrientationType =
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary";
export interface ScreenOrientationState {
  type: ScreenOrientationType;
}
