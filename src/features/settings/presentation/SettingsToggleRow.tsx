"use client";

import { ToggleSwitch } from "@/shared/ui/toggle-switch";

interface SettingsToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  emphasised?: boolean;
  onChange: (next: boolean) => void;
}

/** One labelled preference row: title, explanation, and its switch. */
export function SettingsToggleRow({
  id,
  title,
  description,
  checked,
  disabled = false,
  emphasised = false,
  onChange,
}: SettingsToggleRowProps & { id?: string }) {
  return (
    <div
      id={id}
      className={
        emphasised
          ? "flex flex-col gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
          : "flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
      }
    >
      <div
        className="min-w-0"
      >
        <p
          className="text-sm font-semibold text-on-surface"
        >
          {title}
        </p>
        <p
          className="mt-1 text-xs leading-relaxed text-on-surface-variant"
        >
          {description}
        </p>
      </div>
      <ToggleSwitch
        checked={checked}
        onChange={onChange}
        label={title}
        disabled={disabled}
      />
    </div>
  );
}
