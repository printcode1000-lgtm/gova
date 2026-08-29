'use client';

import { useEffect, useState } from 'react';
import type { SchemaSyncReport } from '@asol/data-core/provisioning';
import { asolApi } from '@/core/api';
import { uiAttributes } from "@asol/ui-registry-core";

export function SchemaSyncPanel() {
  const [report, setReport] = useState<SchemaSyncReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    asolApi
      .getPublicJson<SchemaSyncReport>('/sync_data/schema-sync-report.json')
      .then((data) => {
        setReport(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setReport(null);
        setError(
          err instanceof Error ? err.message : 'تعذر تحميل تقرير مزامنة المخطط',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.11-L0S9Uc", id: "dev.monitor.schema-sync-panel.div.11" })} id="dev.monitor.schema-sync-panel.div" style={{ padding: 16 }}>جارٍ تحميل تقرير مزامنة المخطط…</div>;
  }

  if (error) {
    return (
      <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.12-s3M8A9", id: "dev.monitor.schema-sync-panel.div.12" })} id="dev.monitor.schema-sync-panel.div.2" style={{ padding: 16 }}>
        <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.13-iWo3X1", id: "dev.monitor.schema-sync-panel.div.13" })} id="dev.monitor.schema-sync-panel.div.3" className="detail-section-title">مزامنة المخطط</div>
        <p {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.p.5-YmU3Dv", id: "dev.monitor.schema-sync-panel.p.5" })} id="dev.monitor.schema-sync-panel.p" style={{ color: '#f97316' }}>{error}</p>
        <p {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.p.6-Xhie6W", id: "dev.monitor.schema-sync-panel.p.6" })} id="dev.monitor.schema-sync-panel.p.2" style={{ opacity: 0.7, fontSize: 13 }}>
          نفّذ <code {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.code-JPZS4P", id: "dev.monitor.schema-sync-panel.code" })}>npm run db:schema:sync</code> أو انشر خادم ASOL لإنشاء التقرير.
        </p>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.14-FuHO92", id: "dev.monitor.schema-sync-panel.div.14" })} id="dev.monitor.schema-sync-panel.div.4" style={{ padding: 16 }}>
      <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.15-8EvYVc", id: "dev.monitor.schema-sync-panel.div.15" })} id="dev.monitor.schema-sync-panel.div.5" className="detail-section-title">مزامنة المخطط</div>

      {report.skipped ? (
        <p {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.p.7-qmoMx3", id: "dev.monitor.schema-sync-panel.p.7" })} id="dev.monitor.schema-sync-panel.p.3" style={{ color: '#f97316' }}>تم التخطي: {report.skipReason}</p>
      ) : (
        <>
          <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.16-PrPK03", id: "dev.monitor.schema-sync-panel.div.16" })} id="dev.monitor.schema-sync-panel.div.6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <Stat id="dev.monitor.schema-sync-panel.stat" label="إصدار SQLite" value={report.sqliteSchemaVersion} />
            <Stat id="dev.monitor.schema-sync-panel.stat.2" label="Turso قبل" value={report.tursoSchemaVersionBefore} />
            <Stat id="dev.monitor.schema-sync-panel.stat.3" label="Turso بعد" value={report.tursoSchemaVersionAfter} />
            <Stat id="dev.monitor.schema-sync-panel.stat.4" label="المدة" value={`${report.durationMs}ms`} />
            <Stat id="dev.monitor.schema-sync-panel.stat.5" label="جداول معدّلة" value={String(report.tablesModified)} />
            <Stat id="dev.monitor.schema-sync-panel.stat.6" label="أعمدة مضافة" value={String(report.columnsAdded)} />
            <Stat id="dev.monitor.schema-sync-panel.stat.7" label="فهارس مضافة" value={String(report.indexesAdded)} />
            <Stat id="dev.monitor.schema-sync-panel.stat.8" label="عروض مضافة" value={String(report.viewsAdded)} />
            <Stat id="dev.monitor.schema-sync-panel.stat.9" label="محفّزات مضافة" value={String(report.triggersAdded)} />
          </div>

          <p {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.p.8-6oQ7OQ", id: "dev.monitor.schema-sync-panel.p.8" })} id="dev.monitor.schema-sync-panel.p.4" style={{ opacity: 0.7, fontSize: 13, marginBottom: 12 }}>
            وقت التنفيذ: {report.executedAt}
          </p>

          {report.operations.length > 0 && (
            <>
              <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.17-PoWE96", id: "dev.monitor.schema-sync-panel.div.17" })} id="dev.monitor.schema-sync-panel.div.7" className="detail-section-title">العمليات ({report.operations.length})</div>
              <ul {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.ul.4-p53yAk", id: "dev.monitor.schema-sync-panel.ul.4" })} id="dev.monitor.schema-sync-panel.ul" style={{ fontSize: 13, marginBottom: 16 }}>
                {report.operations.map((op, index) => (
                  <li key={`${op.type}-${index}`} {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.li-T7EUzH", id: "dev.monitor.schema-sync-panel.li" })}>
                    <strong {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.strong-IrpS1Y", id: "dev.monitor.schema-sync-panel.strong" })}>{op.type}</strong>: {op.description}
                  </li>
                ))}
              </ul>
            </>
          )}

          {report.sqlExecuted.length > 0 && (
            <>
              <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.18-2rE2S5", id: "dev.monitor.schema-sync-panel.div.18" })} id="dev.monitor.schema-sync-panel.div.8" className="detail-section-title">SQL المنفّذ</div>
              <pre {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.pre-dIZ2jq", id: "dev.monitor.schema-sync-panel.pre" })} style={{ fontSize: 12, overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                {report.sqlExecuted.join('\n\n')}
              </pre>
            </>
          )}

          {report.warnings.length > 0 && (
            <>
              <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.19-7NLoMZ", id: "dev.monitor.schema-sync-panel.div.19" })} id="dev.monitor.schema-sync-panel.div.9" className="detail-section-title">تحذيرات</div>
              <ul {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.ul.5-VzWuV4", id: "dev.monitor.schema-sync-panel.ul.5" })} id="dev.monitor.schema-sync-panel.ul.2" style={{ color: '#f97316', fontSize: 13 }}>
                {report.warnings.map((warning, index) => (
                  <li key={index} {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.li.2-7DFOzW", id: "dev.monitor.schema-sync-panel.li.2" })}>{warning}</li>
                ))}
              </ul>
            </>
          )}

          {report.errors.length > 0 && (
            <>
              <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.20-1QO18r", id: "dev.monitor.schema-sync-panel.div.20" })} id="dev.monitor.schema-sync-panel.div.10" className="detail-section-title">أخطاء</div>
              <ul {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.ul.6-TUcM7r", id: "dev.monitor.schema-sync-panel.ul.6" })} id="dev.monitor.schema-sync-panel.ul.3" style={{ color: '#ef4444', fontSize: 13 }}>
                {report.errors.map((err, index) => (
                  <li key={index} {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.li.3-OrLY1G", id: "dev.monitor.schema-sync-panel.li.3" })}>{err}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ id, label, value }: { label: string; value: string } & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.21-cp6iC8", id: "dev.monitor.schema-sync-panel.div.21" })} id={id} style={{ background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 8 }}>
      <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.22-3z2FKT", id: "dev.monitor.schema-sync-panel.div.22" })} style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{label}</div>
      <div {...uiAttributes({ uid: "dev.monitor.schema-sync-panel.div.23-jQEZ64", id: "dev.monitor.schema-sync-panel.div.23" })} style={{ fontFamily: 'monospace', fontSize: 13 }}>{value}</div>
    </div>
  );
}
