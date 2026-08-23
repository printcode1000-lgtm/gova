"use client";

import * as React from "react";

import { useSession } from "@/features/auth/ui";

export function useAuthHeaders() {
  const { session } = useSession();
  return React.useMemo(
    () => session?.sessionToken ? { "x-asol-session-token": session.sessionToken } : undefined,
    [session?.sessionToken],
  );
}
