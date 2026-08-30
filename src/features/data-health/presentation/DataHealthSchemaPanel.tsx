import { DatabaseZap } from "lucide-react";

import type { DataHealthReport } from "@asol/data-health-core";
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

export function DataHealthSchemaPanel({
  report,
  loading,
}: {
  report: DataHealthReport | null;
  loading: boolean;
}) {
  const comparison = report?.schemaComparison;
  return (
    <section {...uiAttributes({ uid: "data-health.data-health-schema-panel.section.2-3SPwug", id: "data-health.data-health-schema-panel.section.2" })} id="data-health.data-health-schema-panel.section" className="space-y-3">
      <div {...uiAttributes({ uid: "data-health.data-health-schema-panel.div.6-vFgH9H", id: "data-health.data-health-schema-panel.div.6" })} id="data-health.data-health-schema-panel.div" className="rounded-md border bg-surface p-3 text-sm">
        <div {...uiAttributes({ uid: "data-health.data-health-schema-panel.div.7-Cqvux7", id: "data-health.data-health-schema-panel.div.7" })} id="data-health.data-health-schema-panel.div.2" className="flex items-center gap-2 font-semibold">
          <DatabaseZap id="data-health.data-health-schema-panel.database-zap" className="h-4 w-4" />
          مقارنة قراءة فقط
        </div>
        <p {...uiAttributes({ uid: "data-health.data-health-schema-panel.p.2-Re6kMH", id: "data-health.data-health-schema-panel.p.2" })} id="data-health.data-health-schema-panel.p" className="mt-1 text-xs text-on-surface-variant">
          تعمل المقارنة بين SQLite المحلية وTurso فقط في بيئة التطوير، ولا تنفذ أي تعديل على القواعد السحابية.
        </p>
      </div>
      {loading ? (
        <div {...uiAttributes({ uid: "data-health.data-health-schema-panel.div.8-Yo6yU9", id: "data-health.data-health-schema-panel.div.8" })} id="data-health.data-health-schema-panel.div.3" className="rounded-md border bg-surface p-6 text-center text-sm text-on-surface-variant">
          جاري مقارنة بنية قواعد البيانات المحلية والسحابية...
        </div>
      ) : null}
      {!loading && comparison?.available && comparison.databases.length === 0 ? (
        <div {...uiAttributes({ uid: "data-health.data-health-schema-panel.div.9-HgC529", id: "data-health.data-health-schema-panel.div.9" })} id="data-health.data-health-schema-panel.div.4" className="rounded-md border bg-surface p-6 text-center text-sm text-on-surface-variant">
          لم تُحمّل نتيجة المقارنة بعد.
        </div>
      ) : null}
      {!loading && comparison && !comparison.available ? (
        <div {...uiAttributes({ uid: "data-health.data-health-schema-panel.div.10-1RD2uC", id: "data-health.data-health-schema-panel.div.10" })} id="data-health.data-health-schema-panel.div.5" className="rounded-md border bg-surface p-6 text-center text-sm text-on-surface-variant">
          مقارنة البنية متاحة في بيئة التطوير فقط.
        </div>
      ) : null}
      {comparison?.databases.map((database) => (
        <div key={database.database} {...uiAttributes({ uid: "data-health.data-health-schema-panel.div.11-w0f6NJ", id: "data-health.data-health-schema-panel.div.11" , instance: createOpaqueUiInstanceId("iter-2169ae7ce4", String(database.database))})} className="rounded-md border bg-surface p-3">
          <div {...uiAttributes({ uid: "data-health.data-health-schema-panel.div.12-OWf8fY", id: "data-health.data-health-schema-panel.div.12" , instance: createOpaqueUiInstanceId("iter-90121d5b0e", String(database.database))})} className="flex flex-wrap items-center justify-between gap-2">
            <div {...uiAttributes({ uid: "data-health.data-health-schema-panel.div.13-V5W3SV", id: "data-health.data-health-schema-panel.div.13" , instance: createOpaqueUiInstanceId("iter-70b262e665", String(database.database))})} className="font-semibold">{database.database}</div>
            <span {...uiAttributes({ uid: "data-health.data-health-schema-panel.span-4Z8uYI", id: "data-health.data-health-schema-panel.span" , instance: createOpaqueUiInstanceId("iter-421a9373ee", String(database.database))})}
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
            <p {...uiAttributes({ uid: "data-health.data-health-schema-panel.p.3-YBRu7U", id: "data-health.data-health-schema-panel.p.3" , instance: createOpaqueUiInstanceId("iter-9ee0de1a68", String(database.database))})} className="mt-2 text-sm text-on-surface-variant">{database.message}</p>
          ) : null}
          {database.sqliteVersion ? (
            <div {...uiAttributes({ uid: "data-health.data-health-schema-panel.div.14-I98xWI", id: "data-health.data-health-schema-panel.div.14" , instance: createOpaqueUiInstanceId("iter-3341cda243", String(database.database))})} className="mt-2 grid gap-2 text-xs md:grid-cols-2" dir="ltr">
              <div {...uiAttributes({ uid: "data-health.data-health-schema-panel.div.15-dR7NPx", id: "data-health.data-health-schema-panel.div.15" , instance: createOpaqueUiInstanceId("iter-b453ab572b", String(database.database))})} className="break-all rounded bg-muted p-2">
                SQLite: {database.sqliteVersion}
              </div>
              <div {...uiAttributes({ uid: "data-health.data-health-schema-panel.div.16-rd8Wyv", id: "data-health.data-health-schema-panel.div.16" , instance: createOpaqueUiInstanceId("iter-50cc1d840e", String(database.database))})} className="break-all rounded bg-muted p-2">
                Turso: {database.tursoVersion}
              </div>
            </div>
          ) : null}
          {[...database.operations.map((item) => item.description), ...database.warnings]
            .slice(0, 100)
            .map((message, index) => (
              <div key={`${message}-${index}`} {...uiAttributes({ uid: "data-health.data-health-schema-panel.div.17-OFSf7t", id: "data-health.data-health-schema-panel.div.17" })} className="mt-2 border-t pt-2 text-xs">
                {message}
              </div>
            ))}
        </div>
      ))}
    </section>
  );
}
