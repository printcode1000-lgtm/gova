export const SYSTEM_LOG_ALREADY_RECORDED = Symbol('systemLogAlreadyRecorded');

export function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function markErrorAsLogged(error: unknown): void {
  if (!error || typeof error !== 'object') return;
  Object.defineProperty(error, SYSTEM_LOG_ALREADY_RECORDED, {
    value: true,
    enumerable: false,
    configurable: true,
  });
}

export function isErrorAlreadyLogged(error: unknown): boolean {
  return !!(
    error &&
    typeof error === 'object' &&
    (error as Record<symbol, unknown>)[SYSTEM_LOG_ALREADY_RECORDED] === true
  );
}
