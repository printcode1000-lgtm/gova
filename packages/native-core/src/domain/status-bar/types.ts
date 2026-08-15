export type StatusBarStyle = "default" | "light" | "dark";
export type StatusBarAnimation = "none" | "slide" | "fade";

export interface SetStatusBarStyleOptions {
  style: StatusBarStyle;
}

export interface SetStatusBarBackgroundColorOptions {
  color: string;
}

export interface SetStatusBarAnimationOptions {
  animation: StatusBarAnimation;
}

export interface SetStatusBarOverlaysWebViewOptions {
  overlay: boolean;
}

export interface StatusBarInfo {
  visible: boolean;
  style: StatusBarStyle;
  color?: string;
  overlays?: boolean;
  height?: number;
}
