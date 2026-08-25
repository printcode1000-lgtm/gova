"use client";

import { Switch } from "@/shared/ui/switch";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  "data-simulation-target"?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  "data-simulation-target": simulationTarget,
}: ToggleSwitchProps) {
  return (
    <Switch
      data-simulation-target={simulationTarget}
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={label}
    />
  );
}
