"use client";

import * as React from "react";

import { isSuperAdmin } from "@/features/auth";
import { useSession } from "@/features/auth/ui";
import { simulationApiService } from "../application/services/simulation-api-service";
import type { SimulationUserBootstrapResult } from "../domain/simulation-user-bootstrap.types";

export function useSimulationUsersBootstrap() {
  const { session, isLoading } = useSession();
  const [users, setUsers] = React.useState<SimulationUserBootstrapResult[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const allowed = !isLoading && isSuperAdmin(session);

  const ensure = React.useCallback(async () => {
    if (!session?.sessionToken || !isSuperAdmin(session)) return;
    setBusy(true);
    setError("");
    try {
      setUsers((await simulationApiService.ensureUsers(session.sessionToken)).users);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }, [session]);

  React.useEffect(() => {
    if (allowed) void ensure();
  }, [allowed, ensure]);

  return { allowed, isLoading, users, busy, error, ensure };
}
