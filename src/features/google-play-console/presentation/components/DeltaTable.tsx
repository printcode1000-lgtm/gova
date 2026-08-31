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
      <table className="w-full min-w-[40rem] text-sm" dir="ltr">
        <thead className="bg-muted">
          <tr>
            <th className="p-2 text-left">{t("releaseConsole.delta.id")}</th>
            <th className="p-2 text-left">{t("releaseConsole.delta.before")}</th>
            <th className="p-2 text-left">{t("releaseConsole.delta.after")}</th>
            <th className="p-2 text-left">{t("releaseConsole.delta.change")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-2">{row.id}</td>
              <td className="p-2">{row.leftCompressedBytes}</td>
              <td className="p-2">{row.rightCompressedBytes}</td>
              <td className="p-2">{row.compressedDeltaBytes}</td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td className="p-3 text-on-surface-variant" colSpan={4}>
                {emptyText}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
