export interface GooglePlayConsoleEnvironment {
  allowed: boolean;
  nodeEnv: string;
  publicMode: string;
  vercel: boolean;
}

export interface GooglePlayConsoleConfigStatus {
  packageName: string;
  keyFilePath: string;
  keyFileExists: boolean;
  serviceAccountEmail: string;
  serviceAccountProjectId: string;
  serviceAccountUniqueId: string;
}

export interface GooglePlayConsoleEndpointResult<T = unknown> {
  key: string;
  label: string;
  ok: boolean;
  data: T | null;
  error?: string;
}

export interface GooglePlayConsoleSnapshot {
  environment: GooglePlayConsoleEnvironment;
  fetchedAt: string;
  config: GooglePlayConsoleConfigStatus;
  editId: string | null;
  endpoints: GooglePlayConsoleEndpointResult[];
  summary: {
    successfulEndpoints: number;
    failedEndpoints: number;
    tracks: number;
    releases: number;
    listings: number;
    reviews: number;
    inAppProducts: number;
    subscriptions: number;
  };
}
