import type { LucideIcon } from "lucide-react";
import { uiAttributes } from "@asol/ui-registry-core";

export function Metric({ id, icon: Icon, label, value, detail }: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  detail?: string;
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "google-play-console.metric.div-Y1QmGQ", id: "google-play-console.metric.div" })} id={id} className="rounded-md border bg-surface p-4">
      <div {...uiAttributes({ uid: "google-play-console.metric.div.2-var8VH", id: "google-play-console.metric.div.2" })} className="flex items-center gap-2 text-xs text-on-surface-variant">
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
        {label}
      </div>
      <div {...uiAttributes({ uid: "google-play-console.metric.div.3-42NOTf", id: "google-play-console.metric.div.3" })} className="mt-2 break-all text-xl font-semibold">{value}</div>
      {detail ? <div {...uiAttributes({ uid: "google-play-console.metric.div.4-HCGl2m", id: "google-play-console.metric.div.4" })} className="mt-1 text-xs text-on-surface-variant">{detail}</div> : null}
    </div>
  );
}
