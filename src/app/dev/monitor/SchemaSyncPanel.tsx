'use client';

import { useEffect, useState } from 'react';
import type { SchemaSyncReport } from '@/core/provisioning/types';
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
        setError(err instanceof Error ? err.message : 'Failed to load schema sync report');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: 16 }}>Loading schema sync report…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <div className="detail-section-title">Schema Sync</div>
        <p style={{ color: '#f97316' }}>{error}</p>
        <p style={{ opacity: 0.7, fontSize: 13 }}>
          Run <code>npm run db:schema:sync</code> or deploy the ASOL backend to generate the report.
        </p>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div style={{ padding: 16 }}>
      <div className="detail-section-title">Schema Sync</div>

      {report.skipped ? (
        <p style={{ color: '#f97316' }}>Skipped: {report.skipReason}</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <Stat label="SQLite Version" value={report.sqliteSchemaVersion} />
            <Stat label="Turso Before" value={report.tursoSchemaVersionBefore} />
            <Stat label="Turso After" value={report.tursoSchemaVersionAfter} />
            <Stat label="Duration" value={`${report.durationMs}ms`} />
            <Stat label="Tables Modified" value={String(report.tablesModified)} />
            <Stat label="Columns Added" value={String(report.columnsAdded)} />
            <Stat label="Indexes Added" value={String(report.indexesAdded)} />
            <Stat label="Views Added" value={String(report.viewsAdded)} />
            <Stat label="Triggers Added" value={String(report.triggersAdded)} />
          </div>

          <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 12 }}>
            Executed at: {report.executedAt}
          </p>

          {report.operations.length > 0 && (
            <>
              <div className="detail-section-title">Operations ({report.operations.length})</div>
              <ul style={{ fontSize: 13, marginBottom: 16 }}>
                {report.operations.map((op, index) => (
                  <li key={`${op.type}-${index}`}>
                    <strong>{op.type}</strong>: {op.description}
                  </li>
                ))}
              </ul>
            </>
          )}

          {report.sqlExecuted.length > 0 && (
            <>
              <div className="detail-section-title">SQL Executed</div>
              <pre style={{ fontSize: 12, overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                {report.sqlExecuted.join('\n\n')}
              </pre>
            </>
          )}

          {report.warnings.length > 0 && (
            <>
              <div className="detail-section-title">Warnings</div>
              <ul style={{ color: '#f97316', fontSize: 13 }}>
                {report.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </>
          )}

          {report.errors.length > 0 && (
            <>
              <div className="detail-section-title">Errors</div>
              <ul style={{ color: '#ef4444', fontSize: 13 }}>
                {report.errors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 8 }}>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{value}</div>
    </div>
  );
}
