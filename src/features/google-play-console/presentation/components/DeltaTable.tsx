"use client";

import type { BundleAnalysisDelta } from "@asol/release-core/console";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { uiAttributes } from "@asol/ui-registry-core";

export function DeltaTable({ id, rows, emptyText }: { rows: BundleAnalysisDelta[]; emptyText: string } & { id?: string }) {
  const { t } = useAdminArabic();
  return (
    <div {...uiAttributes({ uid: "google-play-console.delta-table.div-NcPi69", id: "google-play-console.delta-table.div" })} id={id} className="overflow-auto rounded-md border">
      <table {...uiAttributes({ uid: "google-play-console.delta-table.table-4Hu4DF", id: "google-play-console.delta-table.table" })} className="w-full min-w-[40rem] text-sm" dir="ltr">
        <thead {...uiAttributes({ uid: "google-play-console.delta-table.thead-D48Yt3", id: "google-play-console.delta-table.thead" })} className="bg-muted">
          <tr {...uiAttributes({ uid: "google-play-console.delta-table.tr-P5RIXy", id: "google-play-console.delta-table.tr" })}><th {...uiAttributes({ uid: "google-play-console.delta-table.th-V3mIbY", id: "google-play-console.delta-table.th" })} className="p-2 text-left">{t("releaseConsole.delta.id")}</th>
            <th {...uiAttributes({ uid: "google-play-console.delta-table.th.2-SFLPH4", id: "google-play-console.delta-table.th.2" })} className="p-2 text-left">{t("releaseConsole.delta.before")}</th>
            <th {...uiAttributes({ uid: "google-play-console.delta-table.th.3-oY4Qch", id: "google-play-console.delta-table.th.3" })} className="p-2 text-left">{t("releaseConsole.delta.after")}</th>
            <th {...uiAttributes({ uid: "google-play-console.delta-table.th.4-1Knp1A", id: "google-play-console.delta-table.th.4" })} className="p-2 text-left">{t("releaseConsole.delta.change")}</th></tr>
        </thead>
        <tbody {...uiAttributes({ uid: "google-play-console.delta-table.tbody-3D5aL2", id: "google-play-console.delta-table.tbody" })}>
          {rows.map((row) => (
            <tr key={row.id} {...uiAttributes({ uid: "google-play-console.delta-table.tr.2-RZF0QM", id: "google-play-console.delta-table.tr.2" })} className="border-t">
              <td {...uiAttributes({ uid: "google-play-console.delta-table.td-O0zu5X", id: "google-play-console.delta-table.td" })} className="p-2">{row.id}</td><td {...uiAttributes({ uid: "google-play-console.delta-table.td.2-8tcPpZ", id: "google-play-console.delta-table.td.2" })} className="p-2">{row.leftCompressedBytes}</td>
              <td {...uiAttributes({ uid: "google-play-console.delta-table.td.3-P7YaB7", id: "google-play-console.delta-table.td.3" })} className="p-2">{row.rightCompressedBytes}</td>
              <td {...uiAttributes({ uid: "google-play-console.delta-table.td.4-10Vqt5", id: "google-play-console.delta-table.td.4" })} className="p-2">{row.compressedDeltaBytes}</td>
            </tr>
          ))}
          {!rows.length ? <tr {...uiAttributes({ uid: "google-play-console.delta-table.tr.3-Z253MB", id: "google-play-console.delta-table.tr.3" })}><td {...uiAttributes({ uid: "google-play-console.delta-table.td.5-P24hYt", id: "google-play-console.delta-table.td.5" })} className="p-3 text-on-surface-variant" colSpan={4}>{emptyText}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
