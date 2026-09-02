import { Input } from "@/shared/ui/input";

export function Field({ id, label, value, onChange, }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & { id?: string }) {
  return (
    <label id={id} className="block">
      <span id="google-play-console-presentation-components-field-text-2-fmkjup" className="text-xs text-on-surface-variant">{label}</span>
      <Input className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
