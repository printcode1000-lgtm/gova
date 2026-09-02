"use client";

import type { BundleAnalysisDelta } from "@asol/release-core/console";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";

export function DeltaTable({
  id,
  rows,
  emptyText,
}: { rows: BundleAnalysisDelta[]; emptyText: string } & { id?: string }) {
  const { t } = useAdminArabic();
  return (
    <div id={id} className="overflow-auto rounded-md border">
      <table id="google-play-console-presentation-components-deltatable-table-2-ts58bz" className="w-full min-w-[40rem] text-sm" dir="ltr">
        <thead id="google-play-console-presentation-components-deltatable-thead-3-sg9hva" className="bg-muted">
          <tr id="google-play-console-presentation-components-deltatable-tr-4-ofvmh3">
            <th id="google-play-console-presentation-components-deltatable-th-5-xzsaon" className="p-2 text-left">{t("releaseConsole.delta.id")}</th>
            <th id="google-play-console-presentation-components-deltatable-th-6-tjzgyk" className="p-2 text-left">{t("releaseConsole.delta.before")}</th>
            <th id="google-play-console-presentation-components-deltatable-th-7-ajgsqj" className="p-2 text-left">{t("releaseConsole.delta.after")}</th>
            <th id="google-play-console-presentation-components-deltatable-th-8-pezrhx" className="p-2 text-left">{t("releaseConsole.delta.change")}</th>
          </tr>
        </thead>
        <tbody id="google-play-console-presentation-components-deltatable-tbody-9-kqs2j2">
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-2">{row.id}</td>
              <td className="p-2">{row.leftCompressedBytes}</td>
              <td className="p-2">{row.rightCompressedBytes}</td>
              <td className="p-2">{row.compressedDeltaBytes}</td>
            </tr>
          ))}
          {!rows.length ? (
            <tr id="google-play-console-presentation-components-deltatable-tr-10-glpp9u">
              <td id="google-play-console-presentation-components-deltatable-td-11-xt5uiu" className="p-3 text-on-surface-variant" colSpan={4}>
                {emptyText}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
