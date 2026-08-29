
import { uiAttributes } from "@asol/ui-registry-core";export function DetailRow({ id,
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "data-health.detail-row.div-D3D7xJ", id: "data-health.detail-row.div" })} id={id} className="grid gap-1 border-b pb-2 sm:grid-cols-[140px_1fr]">
      <div {...uiAttributes({ uid: "data-health.detail-row.div.2-kFC99j", id: "data-health.detail-row.div.2" })} className="text-xs text-on-surface-variant">{label}</div>
      <div {...uiAttributes({ uid: "data-health.detail-row.div.3-S0XCYr", id: "data-health.detail-row.div.3" })} className="break-all" dir={ltr ? "ltr" : undefined}>
        {value}
      </div>
    </div>
  );
}
