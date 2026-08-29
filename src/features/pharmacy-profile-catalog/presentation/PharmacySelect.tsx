import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { UiDescriptor } from "@asol/ui-registry-core";
import { uiAttributes } from "@asol/ui-registry-core";

export function PharmacySelect({ id,
  ui,
  label,
  value,
  disabled,
  placeholder,
  options,
  onChange,
}: {
  /** Per-instance UiRegistry identity, supplied by the calling screen. */
  ui?: UiDescriptor;
  label: string;
  value: string;
  disabled?: boolean;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
} & { id?: string }) {
  return (
    <label {...uiAttributes({ uid: "pharmacy-profile-catalog.pharmacy-select.label-a61IIk", id: "pharmacy-profile-catalog.pharmacy-select.label" })} id={id} className="space-y-1.5 text-sm font-medium">
      <span {...uiAttributes({ uid: "pharmacy-profile-catalog.pharmacy-select.span-z4JwQr", id: "pharmacy-profile-catalog.pharmacy-select.span" })}>{label}</span>
      <Select value={value} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger ui={ui} className="asol-control asol-field-surface w-full border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
