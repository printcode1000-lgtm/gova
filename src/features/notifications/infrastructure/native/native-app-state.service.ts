"use client";

type Listener = () => void;

export class NativeAppStateService {
  onActive(listener: Listener): () => void {
    if (typeof document === "undefined") return () => undefined;
    const handler = () => {
      if (document.visibilityState === "visible") listener();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }
}

export const nativeAppStateService = new NativeAppStateService();
