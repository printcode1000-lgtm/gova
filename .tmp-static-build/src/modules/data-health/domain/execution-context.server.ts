import "server-only";

import { isDevRuntime } from "@/core/config/runtime-env";

export interface DataHealthExecutionContext {
  environment: "development" | "production";
  runtime: "development-local" | "production-cloud";
  databaseSource: "sqlite" | "turso";
  storageSource: "local" | "r2";
  schemaComparisonAllowed: boolean;
}

export function resolveDataHealthExecutionContext(): DataHealthExecutionContext {
  if (isDevRuntime()) {
    return {
      environment: "development",
      runtime: "development-local",
      databaseSource: "sqlite",
      storageSource: "local",
      schemaComparisonAllowed: true,
    };
  }

  return {
    environment: "production",
    runtime: "production-cloud",
    databaseSource: "turso",
    storageSource: "r2",
    schemaComparisonAllowed: false,
  };
}
