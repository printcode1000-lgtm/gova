'use client';

import { useEffect, useState } from 'react';
import type { SchemaSyncReport } from '@asol/data-core/provisioning';
import { asolApi } from '@/core/api';

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
    return <div id="dev.monitor.schema-sync-panel.div" style={{ padding: 16 }}>جارٍ تحميل تقرير مزامنة المخطط…</div>;
  }

  if (error) {
    return (
      <div id="dev.monitor.schema-sync-panel.div.2" style={{ padding: 16 }}>
        <div id="dev.monitor.schema-sync-panel.div.3" className="detail-section-title">مزامنة المخطط</div>
        <p id="dev.monitor.schema-sync-panel.p" style={{ color: '#f97316' }}>{error}</p>
        <p id="dev.monitor.schema-sync-panel.p.2" style={{ opacity: 0.7, fontSize: 13 }}>
          نفّذ <code>npm run db:schema:sync</code> أو انشر خادم ASOL لإنشاء التقرير.
        </p>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div id="dev.monitor.schema-sync-panel.div.4" style={{ padding: 16 }}>
      <div id="dev.monitor.schema-sync-panel.div.5" className="detail-section-title">مزامنة المخطط</div>

      {report.skipped ? (
        <p id="dev.monitor.schema-sync-panel.p.3" style={{ color: '#f97316' }}>تم التخطي: {report.skipReason}</p>
      ) : (
        <>
          <div id="dev.monitor.schema-sync-panel.div.6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
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

          <p id="dev.monitor.schema-sync-panel.p.4" style={{ opacity: 0.7, fontSize: 13, marginBottom: 12 }}>
            وقت التنفيذ: {report.executedAt}
          </p>

          {report.operations.length > 0 && (
            <>
              <div id="dev.monitor.schema-sync-panel.div.7" className="detail-section-title">العمليات ({report.operations.length})</div>
              <ul id="dev.monitor.schema-sync-panel.ul" style={{ fontSize: 13, marginBottom: 16 }}>
                {report.operations.map((op, index) => {
                  return (
                    <li key={`${op.type}-${index}`}>
                      <strong>{op.type}</strong>: {op.description}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {report.sqlExecuted.length > 0 && (
            <>
              <div id="dev.monitor.schema-sync-panel.div.8" className="detail-section-title">SQL المنفّذ</div>
              <pre style={{ fontSize: 12, overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                {report.sqlExecuted.join('\n\n')}
              </pre>
            </>
          )}

          {report.warnings.length > 0 && (
            <>
              <div id="dev.monitor.schema-sync-panel.div.9" className="detail-section-title">تحذيرات</div>
              <ul id="dev.monitor.schema-sync-panel.ul.2" style={{ color: '#f97316', fontSize: 13 }}>
                {report.warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </>
          )}

          {report.errors.length > 0 && (
            <>
              <div id="dev.monitor.schema-sync-panel.div.10" className="detail-section-title">أخطاء</div>
              <ul id="dev.monitor.schema-sync-panel.ul.3" style={{ color: '#ef4444', fontSize: 13 }}>
                {report.errors.map((err, index) => (
                  <li key={`${err}-${index}`}>{err}</li>
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
    <div id={id} style={{ background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 8 }}>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{value}</div>
    </div>
  );
}
