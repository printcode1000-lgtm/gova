/**
 * How a runtime describes itself: which deployment it is, which platform it
 * runs on, and what it may reach.
 *
 * Deliberately not a database-backend selector. Development is a deployment and
 * build classification — it says the developer is running `next dev`, never that
 * application data lives somewhere else. Server data is Turso in every runtime,
 * and image objects are Cloudflare R2 in every runtime, so there is nothing here
 * left to choose between.
 */
export type AppDeployment = "local-development" | "web-production" | "static-export";
export type AppPlatform = "web" | "android" | "ios";

export interface AppRuntimeContext {
  deployment: AppDeployment;
  platform: AppPlatform;
  isDevelopment: boolean;
  isNative: boolean;
  isStatic: boolean;
  isProvisioning: boolean;
  supportsServerApi: boolean;
  supportsOta: boolean;
}

export interface ServerRuntimeInput {
  nodeEnv?: string;
  mode?: string;
  publicMode?: string;
  vercel?: string;
  vercelEnv?: string;
  provisioning?: string;
  githubActions?: string;
}

export interface ClientRuntimeInput {
  mode?: string;
  apiBaseUrl?: string;
  platform?: AppPlatform;
  native?: boolean;
  otaManifestUrl?: string;
  otaPublicKey?: string;
}

export function resolveServerRuntime(input: ServerRuntimeInput): AppRuntimeContext {
  const mode = (input.mode ?? input.publicMode ?? "").trim().toLowerCase();
  const isStatic = mode === "static" || input.githubActions === "true";
  const isVercel = input.vercel === "1" || Boolean(input.vercelEnv);
  const isDevelopment =
    !isStatic &&
    !isVercel &&
    input.provisioning !== "true" &&
    (mode === "development" || input.nodeEnv === "development");

  return {
    deployment: isStatic ? "static-export" : isDevelopment ? "local-development" : "web-production",
    platform: "web",
    isDevelopment,
    isNative: false,
    isStatic,
    isProvisioning: input.provisioning === "true",
    supportsServerApi: !isStatic,
    supportsOta: false,
  };
}

export function resolveClientRuntime(input: ClientRuntimeInput): AppRuntimeContext {
  const mode = (input.mode ?? "").trim().toLowerCase();
  const platform = input.platform ?? "web";
  const isNative = input.native === true || platform === "android" || platform === "ios";
  const isStatic = mode === "static" || isNative;
  const isDevelopment = mode === "development" && !isNative;

  return {
    deployment: isStatic
      ? "static-export"
      : isDevelopment
        ? "local-development"
        : "web-production",
    platform,
    isDevelopment,
    isNative,
    isStatic,
    isProvisioning: false,
    supportsServerApi: !isStatic || Boolean(input.apiBaseUrl),
    supportsOta:
      isNative && Boolean(input.otaManifestUrl && input.otaPublicKey),
  };
}
