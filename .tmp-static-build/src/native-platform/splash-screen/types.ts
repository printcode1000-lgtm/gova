/** Single responsibility: describe splash-screen transition options. */
export interface SplashHideOptions {
  fadeOutDuration?: number;
}
export interface SplashShowOptions {
  autoHide?: boolean;
  showDuration?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}
