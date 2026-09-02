import type { LucideIcon } from "lucide-react";

export function Metric({ id, icon: Icon, label, value, detail, }: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  detail?: string;
} & { id?: string }) {
  return (
    <div id={id} className="rounded-md border bg-surface p-4">
      <div id="google-play-console-presentation-components-metric-div-2-k1euiw" className="flex items-center gap-2 text-xs text-on-surface-variant">
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
        {label}
      </div>
      <div id="google-play-console-presentation-components-metric-div-3-ah0liw" className="mt-2 break-all text-xl font-semibold">{value}</div>
      {detail ? <div id="google-play-console-presentation-components-metric-div-4-62nypd" className="mt-1 text-xs text-on-surface-variant">{detail}</div> : null}
    </div>
  );
}
