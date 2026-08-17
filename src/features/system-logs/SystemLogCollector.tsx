"use client";

import { useEffect } from "react";

import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { publicEnv } from "@/core/config/public-env";
import { installGlobalCapture } from "@asol/system-logs-core";
import { registerSystemLogsCoreBrowserPorts } from "./system-logs-core-bootstrap";

export function SystemLogCollector() {
  const { session, isLoading } = useSession();
  const authorized = !isLoading && isSuperAdmin(session);

  useEffect(() => {
    registerSystemLogsCoreBrowserPorts();
    return installGlobalCapture({
      authorized,
      versions: () => ({
        appVersion: publicEnv.webBundleVersion,
        nativeVersion: publicEnv.nativeVersion,
      }),
    });
  }, [authorized]);

  return null;
}
