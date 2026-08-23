"use client";

import * as React from "react";

interface OnboardingSaveBridgeValue {
  setImagesPending: (pending: boolean) => void;
}

const OnboardingSaveBridgeContext =
  React.createContext<OnboardingSaveBridgeValue | null>(null);

export function OnboardingSaveBridgeProvider({
  children,
  setImagesPending,
}: {
  children: React.ReactNode;
  setImagesPending: (pending: boolean) => void;
}) {
  const value = React.useMemo(
    () => ({ setImagesPending }),
    [setImagesPending],
  );
  return (
    <OnboardingSaveBridgeContext.Provider value={value}>
      {children}
    </OnboardingSaveBridgeContext.Provider>
  );
}

export function useOnboardingSaveBridge(): OnboardingSaveBridgeValue | null {
  return React.useContext(OnboardingSaveBridgeContext);
}
