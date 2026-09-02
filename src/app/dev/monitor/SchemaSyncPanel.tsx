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
    return <div id='app-dev-monitor-schemasyncpanel-div-1-cpz0x4' style={{ padding: 16 }}>جارٍ تحميل تقرير مزامنة المخطط…</div>;
  }

  if (error) {
    return (
      <div id='app-dev-monitor-schemasyncpanel-div-2-aumerm' style={{ padding: 16 }}>
        <div id='app-dev-monitor-schemasyncpanel-div-3-e9ztqx' className="detail-section-title">مزامنة المخطط</div>
        <p id='app-dev-monitor-schemasyncpanel-text-4-vsecd5' style={{ color: '#f97316' }}>{error}</p>
        <p id='app-dev-monitor-schemasyncpanel-text-5-zi8dnl' style={{ opacity: 0.7, fontSize: 13 }}>
          نفّذ <code id="app-dev-monitor-schemasyncpanel-code-6-viqutl">npm run db:schema:sync</code> أو انشر خادم ASOL لإنشاء التقرير.
        </p>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div id='app-dev-monitor-schemasyncpanel-div-7-mvlftc' style={{ padding: 16 }}>
      <div id='app-dev-monitor-schemasyncpanel-div-8-7zrlzh' className="detail-section-title">مزامنة المخطط</div>

      {report.skipped ? (
        <p id='app-dev-monitor-schemasyncpanel-text-9-6avab2' style={{ color: '#f97316' }}>تم التخطي: {report.skipReason}</p>
      ) : (
        <>
          <div id='app-dev-monitor-schemasyncpanel-div-10-e7imnk' style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <Stat id='app-dev-monitor-schemasyncpanel-stat-11-ppgcw2' label="إصدار SQLite" value={report.sqliteSchemaVersion} />
            <Stat id='app-dev-monitor-schemasyncpanel-stat-12-ytkurb' label="Turso قبل" value={report.tursoSchemaVersionBefore} />
            <Stat id='app-dev-monitor-schemasyncpanel-stat-13-ia0qsf' label="Turso بعد" value={report.tursoSchemaVersionAfter} />
            <Stat id='app-dev-monitor-schemasyncpanel-stat-14-dki74y' label="المدة" value={`${report.durationMs}ms`} />
            <Stat id='app-dev-monitor-schemasyncpanel-stat-15-titbem' label="جداول معدّلة" value={String(report.tablesModified)} />
            <Stat id='app-dev-monitor-schemasyncpanel-stat-16-oxbupm' label="أعمدة مضافة" value={String(report.columnsAdded)} />
            <Stat id='app-dev-monitor-schemasyncpanel-stat-17-ssxp73' label="فهارس مضافة" value={String(report.indexesAdded)} />
            <Stat id='app-dev-monitor-schemasyncpanel-stat-18-nd18pr' label="عروض مضافة" value={String(report.viewsAdded)} />
            <Stat id='app-dev-monitor-schemasyncpanel-stat-19-g3j5m0' label="محفّزات مضافة" value={String(report.triggersAdded)} />
          </div>

          <p id='app-dev-monitor-schemasyncpanel-text-20-5lis1g' style={{ opacity: 0.7, fontSize: 13, marginBottom: 12 }}>
            وقت التنفيذ: {report.executedAt}
          </p>

          {report.operations.length > 0 && (
            <>
              <div id='app-dev-monitor-schemasyncpanel-div-21-vimqh2' className="detail-section-title">العمليات ({report.operations.length})</div>
              <ul id='app-dev-monitor-schemasyncpanel-ul-22-mmc4s9' style={{ fontSize: 13, marginBottom: 16 }}>
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
              <div id='app-dev-monitor-schemasyncpanel-div-23-lnkefx' className="detail-section-title">SQL المنفّذ</div>
              <pre id="app-dev-monitor-schemasyncpanel-pre-24-vesvlp" style={{ fontSize: 12, overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                {report.sqlExecuted.join('\n\n')}
              </pre>
            </>
          )}

          {report.warnings.length > 0 && (
            <>
              <div id='app-dev-monitor-schemasyncpanel-div-25-mxhg5c' className="detail-section-title">تحذيرات</div>
              <ul id='app-dev-monitor-schemasyncpanel-ul-26-shdoas' style={{ color: '#f97316', fontSize: 13 }}>
                {report.warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </>
          )}

          {report.errors.length > 0 && (
            <>
              <div id='app-dev-monitor-schemasyncpanel-div-27-9apsni' className="detail-section-title">أخطاء</div>
              <ul id='app-dev-monitor-schemasyncpanel-ul-28-eenn54' style={{ color: '#ef4444', fontSize: 13 }}>
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
      <div id="app-dev-monitor-schemasyncpanel-div-30-a4i6ph" style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{label}</div>
      <div id="app-dev-monitor-schemasyncpanel-div-31-ucvpjn" style={{ fontFamily: 'monospace', fontSize: 13 }}>{value}</div>
    </div>
  );
}
