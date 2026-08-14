"use client";

import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60",
        checked
          ? "border-primary bg-primary"
          : "border-outline-variant bg-surface-variant",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-[inset-inline-start]",
          checked ? "start-7" : "start-1",
        )}
      />
    </button>
  );
}
