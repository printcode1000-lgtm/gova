"use client";

import { Loader2, PackageCheck, XCircle } from "lucide-react";

import { commandLabel } from "./order-labels";

export function OrderActionButton({
  action,
  busyAction,
  id,
  onClick,
  tone = "normal",
  full = false,
  disabled = false,
}: {
  action: string;
  busyAction: string;
  id: string;
  onClick: () => void;
  tone?: "normal" | "danger";
  full?: boolean;
  disabled?: boolean;
}) {
  const busy = busyAction === `${action}:${id}` || busyAction === `${action}:`;
  const danger = tone === "danger";
  const isDisabled = Boolean(busyAction) || disabled;
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        full ? "w-full" : ""
      } ${
        danger
          ? "bg-error/10 text-error hover:bg-error/15"
          : "bg-primary/10 text-primary hover:bg-primary/15"
      }`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : danger ? (
        <XCircle className="h-4 w-4" />
      ) : (
        <PackageCheck className="h-4 w-4" />
      )}
      {commandLabel(action)}
    </button>
  );
}
