"use client";

type Listener = () => void;

export class CapacitorAppStateService {
  onActive(listener: Listener): () => void {
    if (typeof document === "undefined") return () => undefined;
    const handler = () => {
      if (document.visibilityState === "visible") listener();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }
}

export const capacitorAppStateService = new CapacitorAppStateService();
