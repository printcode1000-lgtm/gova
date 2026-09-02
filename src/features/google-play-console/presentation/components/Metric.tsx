import type { LucideIcon } from "lucide-react";

export function Metric({ id, icon: Icon, label, value, detail, }: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  detail?: string;
} & { id?: string }) {
  return (
    <div id={id} className="rounded-md border bg-surface p-4">
      <div id={id ? `${id}-div-2-k1euiw` : undefined} className="flex items-center gap-2 text-xs text-on-surface-variant">
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
        {label}
      </div>
      <div id={id ? `${id}-div-3-ah0liw` : undefined} className="mt-2 break-all text-xl font-semibold">{value}</div>
      {detail ? <div id={id ? `${id}-div-4-62nypd` : undefined} className="mt-1 text-xs text-on-surface-variant">{detail}</div> : null}
    </div>
  );
}
