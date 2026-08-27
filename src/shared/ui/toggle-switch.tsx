"use client";

import type { UiDescriptor } from "@asol/ui-registry-core";
import { Switch } from "@/shared/ui/switch";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  /** Registered UiRegistry descriptor for this instance, from the caller. */
  ui?: UiDescriptor;
  id?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  ui,
  id,
}: ToggleSwitchProps & { id?: string }) {
  return (
    <Switch
      id={id}
      ui={ui}
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={label}
    />
  );
}
