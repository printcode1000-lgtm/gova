"use client";

import { useEffect, useState } from "react";
import { SIMULATION_ACTIVE_ATTRIBUTE } from "./overlay-chrome";

export function useSimulationActive(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const publish = () => {
      setActive(root.getAttribute(SIMULATION_ACTIVE_ATTRIBUTE) === "true");
    };
    publish();

    const observer = new MutationObserver(publish);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [SIMULATION_ACTIVE_ATTRIBUTE],
    });
    return () => observer.disconnect();
  }, []);

  return active;
}
