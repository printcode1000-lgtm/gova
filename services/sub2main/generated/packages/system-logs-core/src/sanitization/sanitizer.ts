import type { StoredSystemLogInput, SystemLogInput } from '../domain/entities';

const SECRET_KEY =
  /\b(authorization|cookie|set-cookie|token|secret|password|api[-_]?key|private[-_]?key|session[-_]?token)\b/gi;

export function redactSystemLogText(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<email>')
    .replace(/\b01[0-9]{9}\b/g, '<phone>')
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer <redacted>')
    .replace(
      /(authorization|cookie|set-cookie|token|secret|password|api[-_]?key|private[-_]?key|session[-_]?token)(["']?\s*[:=]\s*["']?)[^,;\s}"']+/gi,
      '$1$2<redacted>',
    )
    .replace(
      /([?&](?:token|secret|password|api[-_]?key)=)[^&#\s]+/gi,
      '$1<redacted>',
    );
}

function safeSource(input: SystemLogInput) {
  return input.source === 'resource' ||
    input.source === 'react' ||
    input.source === 'native'
    ? input.source
    : 'client';
}

export function sanitizePersistentSystemLog(
  input: SystemLogInput,
  provenance: 'trusted-server' | 'untrusted-client',
): StoredSystemLogInput {
  const trusted = provenance === 'trusted-server';
  return {
    ...input,
    source: trusted ? input.source : safeSource(input),
    platform: !trusted && input.platform === 'server' ? 'web' : input.platform,
    origin: trusted ? 'cloud' : 'client',
    trustLevel: provenance,
    consoleMethod: redactSystemLogText(input.consoleMethod),
    message: redactSystemLogText(input.message),
    page: redactSystemLogText(input.page),
    errorName: redactSystemLogText(input.errorName) || undefined,
    sourceFile: redactSystemLogText(input.sourceFile) || undefined,
    stack: redactSystemLogText(input.stack) || undefined,
    userAgent: redactSystemLogText(input.userAgent) || undefined,
    feature: redactSystemLogText(input.feature) || undefined,
    operation: redactSystemLogText(input.operation) || undefined,
    routeName: redactSystemLogText(input.routeName) || undefined,
    requestMethod: redactSystemLogText(input.requestMethod) || undefined,
    appVersion: redactSystemLogText(input.appVersion) || undefined,
    nativeVersion: redactSystemLogText(input.nativeVersion) || undefined,
    uid: redactSystemLogText(input.uid) || undefined,
    correlationId: redactSystemLogText(input.correlationId) || undefined,
    requestFlowId: redactSystemLogText(input.requestFlowId) || undefined,
    sessionId: redactSystemLogText(input.sessionId) || undefined,
    monitorTraceId: redactSystemLogText(input.monitorTraceId) || undefined,
  };
}

export function containsSensitiveSystemLogKey(value: string): boolean {
  SECRET_KEY.lastIndex = 0;
  return SECRET_KEY.test(value);
}
