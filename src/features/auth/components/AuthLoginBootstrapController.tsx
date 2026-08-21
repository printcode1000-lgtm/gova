"use client";

import { useEffect } from "react";

import { useSession } from "@/features/auth/components/SessionProvider";
import {
  announceAuthLoginCompleted,
  consumePendingAuthLoginCompleted,
} from "@/features/auth/application/auth-lifecycle-events";

/**
 * Replays a fresh-login signal after a hard navigation that saved a new session
 * in IndexedDB first — super-admin impersonation start/stop uses this path.
 */
export function AuthLoginBootstrapController() {
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (isLoading || !session?.uid) return;

    void consumePendingAuthLoginCompleted().then((pending) => {
      if (!pending) return;
      if (pending.uid !== session.uid || pending.phone !== session.phone) return;
      announceAuthLoginCompleted(pending);
    });
  }, [isLoading, session?.phone, session?.uid]);

  return null;
}
