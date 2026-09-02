import { Input } from "@/shared/ui/input";

export function Field({ id, label, value, onChange, }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & { id?: string }) {
  return (
    <label id={id} className="block">
      <span id={id ? `${id}-text-2-fmkjup` : undefined} className="text-xs text-on-surface-variant">{label}</span>
      <Input id={id ? `${id}-input-118712` : undefined} className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
