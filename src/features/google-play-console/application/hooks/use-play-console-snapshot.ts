"use client";

import * as React from "react";

import type { GooglePlayConsoleSnapshot } from "../domain/types";
import { playConsoleApiService } from "../services/play-console-api-service";
import { useAuthHeaders } from "./use-auth-headers";

export function usePlayConsoleSnapshot() {
  const headers = useAuthHeaders();
  const [snapshot, setSnapshot] = React.useState<GooglePlayConsoleSnapshot | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const refresh = React.useCallback(async () => {
    if (!headers) return;
    setBusy(true); setError("");
    try { setSnapshot(await playConsoleApiService.snapshot(headers)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "releaseConsole.errors.load"); }
    finally { setBusy(false); }
  }, [headers]);
  React.useEffect(() => { void refresh(); }, [refresh]);
  return { snapshot, busy, error, refresh };
}
