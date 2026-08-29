
import { uiAttributes } from "@asol/ui-registry-core";export function InfoRow({ id, label, value, ltr = false }: { label: string; value: string; ltr?: boolean } & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "google-play-console.info-row.div-9H3NZk", id: "google-play-console.info-row.div" })} id={id} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
      <dt {...uiAttributes({ uid: "google-play-console.info-row.dt-9TK6FN", id: "google-play-console.info-row.dt" })} className="text-xs text-on-surface-variant">{label}</dt>
      <dd {...uiAttributes({ uid: "google-play-console.info-row.dd-Gcs9D4", id: "google-play-console.info-row.dd" })} className="break-all text-sm font-medium" dir={ltr ? "ltr" : undefined}>{value}</dd>
    </div>
  );
}
