import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

export function PharmacySelect({ id,
  label,
  value,
  disabled,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
} & { id?: string }) {

  return (
    <label id={id} className="space-y-1.5 text-sm font-medium">
      <span id={id ? `${id}-text-2-62lro2` : undefined}>{label}</span>
      <Select value={value} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger className="asol-control asol-field-surface w-full border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring">
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
