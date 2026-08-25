"use client";

import * as React from "react";

import { useSession } from "@/features/auth/ui";
import { productionDeployApiService } from "@/features/release-commands/application/services/production-deploy-api-service";
import {
  REMOTE_DEPLOY_ALL_CONFIRMATION,
  isRemoteDeployAllTerminal,
  type RemoteDeployAllResult,
} from "@asol/vercel-deploy-core/remote-deploy-contracts";

const ACTIVE_POLL_MS = 5_000;
const IDLE_POLL_MS = 20_000;

export interface ProductionDeployState {
  result: RemoteDeployAllResult | null;
  running: boolean;
  starting: boolean;
  error: string;
  start(): Promise<void>;
}

/**
 * Live view of the production deploy for the super-admin console.
 *
 * Polling — not a socket: the release runs in a sandbox that survives this
 * page, and a poll of its state file is the only reading that stays correct
 * when the console is closed and reopened mid-release.
 */
export function useProductionDeploy(): ProductionDeployState {
  const { session } = useSession();
  const headers = React.useMemo(
    () => (session?.sessionToken ? { "x-asol-session-token": session.sessionToken } : undefined),
    [session?.sessionToken],
  );
  const [result, setResult] = React.useState<RemoteDeployAllResult | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState("");

  const running = Boolean(
    result &&
      result.snapshot.status !== "idle" &&
      !isRemoteDeployAllTerminal(result.snapshot.status),
  );

  React.useEffect(() => {
    if (!headers) return;
    let cancelled = false;
    let timer = 0;
    const tick = async () => {
      try {
        const next = await productionDeployApiService.status(headers);
        if (cancelled) return;
        setResult(next);
        timer = window.setTimeout(
          tick,
          next.snapshot.status === "idle" || isRemoteDeployAllTerminal(next.snapshot.status)
            ? IDLE_POLL_MS
            : ACTIVE_POLL_MS,
        );
      } catch (pollError) {
        if (cancelled) return;
        setError(pollError instanceof Error ? pollError.message : String(pollError));
        timer = window.setTimeout(tick, IDLE_POLL_MS);
      }
    };
    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [headers]);

  const start = React.useCallback(async () => {
    if (!headers || starting) return;
    setStarting(true);
    setError("");
    try {
      setResult(
        await productionDeployApiService.start(
          { confirmation: REMOTE_DEPLOY_ALL_CONFIRMATION },
          headers,
        ),
      );
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : String(startError));
    } finally {
      setStarting(false);
    }
  }, [headers, starting]);

  return { result, running, starting, error, start };
}
