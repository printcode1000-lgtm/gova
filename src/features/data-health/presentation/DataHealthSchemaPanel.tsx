import { DatabaseZap } from "lucide-react";

import type { DataHealthReport } from "@asol/data-health-core";

export function DataHealthSchemaPanel({
  report,
  loading,
}: {
  report: DataHealthReport | null;
  loading: boolean;
}) {
  const comparison = report?.schemaComparison;
  return (
    <section id="data-health.data-health-schema-panel.section" className="space-y-3">
      <div id="data-health.data-health-schema-panel.div" className="rounded-md border bg-surface p-3 text-sm">
        <div id="data-health.data-health-schema-panel.div.2" className="flex items-center gap-2 font-semibold">
          <DatabaseZap id="data-health.data-health-schema-panel.database-zap" className="h-4 w-4" />
          مقارنة قراءة فقط
        </div>
        <p id="data-health.data-health-schema-panel.p" className="mt-1 text-xs text-on-surface-variant">
          تعمل المقارنة بين SQLite المحلية وTurso فقط في بيئة التطوير، ولا تنفذ أي تعديل على القواعد السحابية.
        </p>
      </div>
      {loading ? (
        <div id="data-health.data-health-schema-panel.div.3" className="rounded-md border bg-surface p-6 text-center text-sm text-on-surface-variant">
          جاري مقارنة بنية قواعد البيانات المحلية والسحابية...
        </div>
      ) : null}
      {!loading && comparison?.available && comparison.databases.length === 0 ? (
        <div id="data-health.data-health-schema-panel.div.4" className="rounded-md border bg-surface p-6 text-center text-sm text-on-surface-variant">
          لم تُحمّل نتيجة المقارنة بعد.
        </div>
      ) : null}
      {!loading && comparison && !comparison.available ? (
        <div id="data-health.data-health-schema-panel.div.5" className="rounded-md border bg-surface p-6 text-center text-sm text-on-surface-variant">
          مقارنة البنية متاحة في بيئة التطوير فقط.
        </div>
      ) : null}
      {comparison?.databases.map((database) => (
        <div key={database.database} className="rounded-md border bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{database.database}</div>
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                database.status === "matched"
                  ? "bg-green-50 text-green-700"
                  : database.status === "skipped"
                    ? "bg-gray-100 text-gray-600"
                    : "bg-amber-50 text-amber-800"
              }`}
            >
              {database.status === "matched"
                ? "متطابقة"
                : database.status === "different"
                  ? "توجد فروق"
                  : database.status === "skipped"
                    ? "غير متاح"
                    : "فشل الفحص"}
            </span>
          </div>
          {database.message ? (
            <p className="mt-2 text-sm text-on-surface-variant">{database.message}</p>
          ) : null}
          {database.sqliteVersion ? (
            <div className="mt-2 grid gap-2 text-xs md:grid-cols-2" dir="ltr">
              <div className="break-all rounded bg-muted p-2">
                SQLite: {database.sqliteVersion}
              </div>
              <div className="break-all rounded bg-muted p-2">
                Turso: {database.tursoVersion}
              </div>
            </div>
          ) : null}
          {[...database.operations.map((item) => item.description), ...database.warnings]
            .slice(0, 100)
            .map((message, index) => (
              <div
                key={`${message}-${index}`}
                className="mt-2 border-t pt-2 text-xs"
              >
                {message}
              </div>
            ))}
        </div>
      ))}
    </section>
  );
}
