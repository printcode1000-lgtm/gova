import { Input } from "@/shared/ui/input";
import { uiAttributes } from "@asol/ui-registry-core";

export function Field({ id, label, value, onChange }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & { id?: string }) {
  return (
    <label {...uiAttributes({ uid: "google-play-console.field.label-4gA7Qj", id: "google-play-console.field.label" })} id={id} className="block">
      <span {...uiAttributes({ uid: "google-play-console.field.span-DR4oKv", id: "google-play-console.field.span" })} className="text-xs text-on-surface-variant">{label}</span>
      <Input ui={{ uid: "google-play-console.field.input-LTN5q0", id: "google-play-console.field.input" }} className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
