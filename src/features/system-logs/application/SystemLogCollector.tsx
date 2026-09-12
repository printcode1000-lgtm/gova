"use client";

import { useEffect } from "react";

import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { isDevelopment } from "@/core/config";
import { publicEnv } from "@/core/config/public-env";
import { useSimulationActive } from "@/shared/ui/use-simulation-active";
import { installGlobalCapture } from "@asol/system-logs-core";
import { registerSystemLogsCoreBrowserPorts } from "./system-logs-core-bootstrap";

export function SystemLogCollector() {
  const { session, isLoading } = useSession();
  const simulationActive = useSimulationActive();
  const authorized =
    !isLoading &&
    (isSuperAdmin(session) || (isDevelopment && simulationActive));

  useEffect(() => {
    registerSystemLogsCoreBrowserPorts();
    return installGlobalCapture({
      authorized,
      developmentBuild: publicEnv.developmentBuild,
      versions: () => ({
        appVersion: publicEnv.webBundleVersion,
        nativeVersion: publicEnv.nativeVersion,
      }),
    });
  }, [authorized]);

  return null;
}
