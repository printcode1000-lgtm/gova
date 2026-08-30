import { Input } from "@/shared/ui/input";
import { uiAttributes, type UiInstanceId } from "@asol/ui-registry-core";

export function Field({ id, label, value, onChange, instance }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  instance?: UiInstanceId;
} & { id?: string }) {
  return (
    <label {...uiAttributes({ uid: "google-play-console.field.label-4gA7Qj", id: "google-play-console.field.label", instance: instance })} id={id} className="block">
      <span {...uiAttributes({ uid: "google-play-console.field.span-DR4oKv", id: "google-play-console.field.span", instance: instance })} className="text-xs text-on-surface-variant">{label}</span>
      <Input ui={{ uid: "google-play-console.field.input-LTN5q0", id: "google-play-console.field.input", instance: instance }} className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
