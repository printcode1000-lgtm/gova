/** Application lifecycle contract — state, identity, deep links, and exit. */

export interface AppInfo {
  /** Display name as the OS shows it. */
  name: string;
  /** Bundle identifier, e.g. `hgh.asol.app`. */
  id: string;
  /** User-visible version — Android `versionName` / iOS `MARKETING_VERSION`. */
  version: string;
  /** Numeric build — Android `versionCode` / iOS `CURRENT_PROJECT_VERSION`. */
  build: string;
}

export interface AppState {
  /** True while the application is in the foreground. */
  isActive: boolean;
}

export interface AppDeepLink {
  /** The full URL the OS handed to the application. */
  url: string;
}

export type AppStateListener = (state: AppState) => void;
export type AppDeepLinkListener = (link: AppDeepLink) => void;
export type AppUnsubscribe = () => void;
