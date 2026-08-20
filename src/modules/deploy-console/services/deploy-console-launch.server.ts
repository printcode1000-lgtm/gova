import "server-only";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import {
  assertStrictLocalDevelopmentAllowed,
  readLocalDevelopmentRuntimeFromProcess,
} from "@asol/dev-core/server";

import {
  buildCommandsForRequest,
  parseLaunchRequest,
} from "../domain/build-commands";
import {
  getActiveDeployConsoleRun,
  readDeployConsoleLog,
  startDetachedDeployRun,
  type DeployConsoleRunState,
} from "./deploy-console-run.server";

export function assertDeployConsoleAllowed(): void {
  assertStrictLocalDevelopmentAllowed(
    readLocalDevelopmentRuntimeFromProcess(getServerRuntimeContext()),
    "localDevelopmentOnly",
  );
}

export function launchDeployConsole(body: unknown): DeployConsoleRunState {
  assertDeployConsoleAllowed();
  const request = parseLaunchRequest(body);
  const built = buildCommandsForRequest(request);
  return startDetachedDeployRun(built);
}

export function pollDeployConsoleLog(offset: number) {
  assertDeployConsoleAllowed();
  return readDeployConsoleLog(offset);
}

export function readDeployConsoleStatus(): DeployConsoleRunState | null {
  assertDeployConsoleAllowed();
  return getActiveDeployConsoleRun();
}
