/** Single responsibility: expose the application lifecycle module. */
export { app, AppModule } from "./app";
export type {
  AppDeepLink,
  AppDeepLinkListener,
  AppInfo,
  AppState,
  AppStateListener,
  AppUnsubscribe,
} from "./types";
