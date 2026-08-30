"use client";

import { ToggleSwitch } from "@/shared/ui/toggle-switch";
import {
  createUiSubpartInstanceId,
  uiAttributes,
  type UiDescriptor,
} from "@asol/ui-registry-core";

interface SettingsToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  emphasised?: boolean;
  /** Registered UiRegistry descriptor for this row's switch and runtime scope. */
  ui: UiDescriptor;
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
  ui,
  onChange,
}: SettingsToggleRowProps & { id?: string }) {
  return (
    <div
      {...uiAttributes({
        uid: "settings.settings-toggle-row.div-687FJH",
        id: "settings.settings-toggle-row.div",
        instance: createUiSubpartInstanceId(ui.uid, ui.instance, "row"),
      })}
      id={id}
      className={
        emphasised
          ? "flex flex-col gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
          : "flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
      }
    >
      <div
        {...uiAttributes({
          uid: "settings.settings-toggle-row.div.2-HqrV8B",
          id: "settings.settings-toggle-row.div.2",
          instance: createUiSubpartInstanceId(ui.uid, ui.instance, "copy"),
        })}
        className="min-w-0"
      >
        <p
          {...uiAttributes({
            uid: "settings.settings-toggle-row.p-yEBmt5",
            id: "settings.settings-toggle-row.p",
            instance: createUiSubpartInstanceId(ui.uid, ui.instance, "title"),
          })}
          className="text-sm font-semibold text-on-surface"
        >
          {title}
        </p>
        <p
          {...uiAttributes({
            uid: "settings.settings-toggle-row.p.2-4H7dJG",
            id: "settings.settings-toggle-row.p.2",
            instance: createUiSubpartInstanceId(ui.uid, ui.instance, "description"),
          })}
          className="mt-1 text-xs leading-relaxed text-on-surface-variant"
        >
          {description}
        </p>
      </div>
      <ToggleSwitch
        ui={ui}
        checked={checked}
        onChange={onChange}
        label={title}
        disabled={disabled}
      />
    </div>
  );
}
