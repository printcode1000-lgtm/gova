"use client";

import * as React from "react";

export type SettingsStatusTone = "success" | "error";

export type ShowSettingsStatus = (
  message: string,
  tone?: SettingsStatusTone,
) => void;

export interface SettingsStatusBanner {
  statusText: string;
  statusTone: SettingsStatusTone;
  showStatus: ShowSettingsStatus;
  clearStatus: () => void;
}

/**
 * A transient status line for a settings surface.
 *
 * The timeout is owned by a ref rather than left running: a second message
 * cancels the first one's timer, so it keeps its full duration instead of being
 * wiped by the previous message's countdown, and unmounting cancels it entirely
 * instead of setting state on a component that is gone.
 */
export function useSettingsStatusBanner(
  durationMs = 3000,
): SettingsStatusBanner {
  const [statusText, setStatusText] = React.useState("");
  const [statusTone, setStatusTone] =
    React.useState<SettingsStatusTone>("success");
  const timerRef = React.useRef<number | null>(null);

  const cancelTimer = React.useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const clearStatus = React.useCallback(() => {
    cancelTimer();
    setStatusText("");
  }, [cancelTimer]);

  const showStatus = React.useCallback(
    (message: string, tone: SettingsStatusTone = "success") => {
      cancelTimer();
      setStatusTone(tone);
      setStatusText(message);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setStatusText("");
      }, durationMs);
    },
    [cancelTimer, durationMs],
  );

  React.useEffect(() => cancelTimer, [cancelTimer]);

  return { statusText, statusTone, showStatus, clearStatus };
}
