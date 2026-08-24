"use client";

import * as React from "react";

export interface NotificationRuntimeIdentity {
  uid: string;
  phone: string;
}

export interface NotificationLoginCompleted {
  uid: string;
  phone: string;
  sequence: number;
}

interface NotificationRuntimeContextValue {
  identity: NotificationRuntimeIdentity | null;
  isLoading: boolean;
  loginCompleted: NotificationLoginCompleted | null;
}

const NotificationRuntimeContext = React.createContext<NotificationRuntimeContextValue | null>(null);

export function NotificationRuntimeProvider({
  identity,
  isLoading,
  loginCompleted,
  children,
}: NotificationRuntimeContextValue & { children: React.ReactNode }) {
  const value = React.useMemo(
    () => ({ identity, isLoading, loginCompleted }),
    [identity, isLoading, loginCompleted],
  );
  return (
    <NotificationRuntimeContext.Provider value={value}>
      {children}
    </NotificationRuntimeContext.Provider>
  );
}

export function useNotificationRuntime(): NotificationRuntimeContextValue {
  const value = React.useContext(NotificationRuntimeContext);
  if (!value) {
    throw new Error("NotificationRuntimeProviderMissing");
  }
  return value;
}
