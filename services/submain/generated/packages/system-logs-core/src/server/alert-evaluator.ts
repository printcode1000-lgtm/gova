import type { PersistentSystemLogEntry } from '../domain/entities';
import { systemLogsEnvironment } from '../ports';

const recentByFingerprint = new Map<string, number[]>();

export async function evaluateAlerts(entry: PersistentSystemLogEntry) {
  if (entry.level !== 'error') return;
  const webhook = systemLogsEnvironment().alertWebhookUrl();
  if (!webhook) return;

  const threshold = systemLogsEnvironment().alertThreshold();
  const windowMs = systemLogsEnvironment().alertWindowMs();
  const cutoff = Date.now() - windowMs;
  const key = entry.fingerprint;
  const recent = (recentByFingerprint.get(key) ?? []).filter((time) => time >= cutoff);
  recent.push(Date.now());
  recentByFingerprint.set(key, recent);
  if (recent.length < threshold) return;

  const payload = {
    type: 'system-log-alert',
    fingerprint: entry.fingerprint,
    feature: entry.feature,
    operation: entry.operation,
    message: entry.message,
    occurrences: entry.occurrences,
    recentWindowCount: recent.length,
    lastOccurredAt: entry.lastOccurredAt,
    correlationId: entry.correlationId,
  };

  await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}
