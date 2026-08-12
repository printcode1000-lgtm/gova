"use client";

import { useEffect, useState, type ReactNode } from "react";

import { initializeClientInstallation } from "./installation-bootstrap";
import { reportPreAuthFailure } from "@/features/system-logs/pre-auth-failure-reporter";

export function InstallationBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void initializeClientInstallation()
      .catch((error) => {
        reportPreAuthFailure("installation-bootstrap", error);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return ready ? children : null;
}
