export interface AppInfo {
  name: string;
  id: string;
  build: string;
  version: string;
}

export interface AppState {
  isActive: boolean;
}

export interface AppLaunchUrl {
  url: string;
}

export interface AppRestoredResult {
  pluginId: string;
  methodName: string;
  data?: unknown;
}
