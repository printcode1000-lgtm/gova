import type { StoredSystemLogInput } from '../domain/entities';

export function emitTerminalSystemLog(
  sanitized: StoredSystemLogInput,
  structured = true,
) {
  const terminalDetails = {
    source: sanitized.source,
    platform: sanitized.platform,
    feature: sanitized.feature,
    operation: sanitized.operation,
    errorName: sanitized.errorName,
    statusCode: sanitized.statusCode,
    page: sanitized.page,
    message: sanitized.message,
    correlationId: sanitized.correlationId,
    requestFlowId: sanitized.requestFlowId,
    sessionId: sanitized.sessionId,
  };

  if (structured) {
    const line = JSON.stringify({
      level: sanitized.level,
      channel: 'asol.system-log',
      ...terminalDetails,
    });
    if (sanitized.level === 'warning') console.warn(line);
    else if (sanitized.level === 'error') console.error(line);
    return;
  }

  if (sanitized.level === 'warning') {
    console.warn('[Asol][SystemLog] Operation did not complete', terminalDetails);
  } else if (sanitized.level === 'error') {
    console.error('[Asol][SystemLog] Operation failed', terminalDetails);
  }
}
