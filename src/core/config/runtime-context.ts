export type AppDeployment = "local-development" | "web-production" | "static-export";
export type AppPlatform = "web" | "android" | "ios";
export type AppDataSource = "local" | "cloud";

export interface AppRuntimeContext {
  deployment: AppDeployment;
  platform: AppPlatform;
  dataSource: AppDataSource;
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
  dataSource?: string;
  provisioning?: string;
  githubActions?: string;
}

export function resolveServerRuntime(input: ServerRuntimeInput): AppRuntimeContext {
  const mode = (input.mode ?? input.publicMode ?? "").trim().toLowerCase();
  const isStatic = mode === "static" || input.githubActions === "true";
  const isVercel = input.vercel === "1" || Boolean(input.vercelEnv);
  const requestedSource = input.dataSource?.trim().toLowerCase();
  const isDevelopment =
    !isStatic &&
    !isVercel &&
    input.provisioning !== "true" &&
    (requestedSource === "local" ||
      (requestedSource !== "cloud" &&
        (mode === "development" || input.nodeEnv === "development")));

  return {
    deployment: isStatic ? "static-export" : isDevelopment ? "local-development" : "web-production",
    platform: "web",
    dataSource: isDevelopment ? "local" : "cloud",
    isDevelopment,
    isNative: false,
    isStatic,
    isProvisioning: input.provisioning === "true",
    supportsServerApi: !isStatic,
    supportsOta: false,
  };
}
