"use client";

import { useEffect, useState, type ReactNode } from "react";

import { initializeClientInstallation } from "./installation-bootstrap";

export function InstallationBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void initializeClientInstallation()
      .catch((error) => {
        console.error("[InstallationBootstrap] Initialization failed.", error);
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
