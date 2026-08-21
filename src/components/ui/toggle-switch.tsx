"use client";

import { Switch } from "@/components/ui/switch";

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
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={label}
    />
  );
}
