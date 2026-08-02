import type { LucideIcon } from "lucide-react";

export function Metric({ icon: Icon, label, value, detail }: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-md border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
        {label}
      </div>
      <div className="mt-2 break-all text-xl font-semibold">{value}</div>
      {detail ? <div className="mt-1 text-xs text-on-surface-variant">{detail}</div> : null}
    </div>
  );
}
