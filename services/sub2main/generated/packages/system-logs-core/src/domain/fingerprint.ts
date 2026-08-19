import type { SystemLogInput } from './entities';

function clip(value: string | undefined, max: number) {
  if (!value) return '';
  return value.length > max ? value.slice(0, max) : value;
}

export type SystemLogFingerprintInput = Pick<
  SystemLogInput,
  | 'level'
  | 'consoleMethod'
  | 'message'
  | 'page'
  | 'platform'
  | 'errorName'
  | 'sourceFile'
  | 'sourceLine'
  | 'sourceColumn'
  | 'feature'
  | 'operation'
  | 'stack'
  | 'routeName'
> & {
  origin?: string;
  trustLevel?: string;
};

export function buildSystemLogFingerprint(input: SystemLogFingerprintInput) {
  return [
    input.origin ?? '',
    input.trustLevel ?? '',
    input.level,
    input.consoleMethod,
    input.message,
    input.page,
    input.platform,
    input.errorName ?? '',
    input.sourceFile ?? '',
    input.sourceLine ?? '',
    input.sourceColumn ?? '',
    input.feature ?? '',
    input.operation ?? '',
    input.routeName ?? '',
    clip(input.stack, 2_000),
  ].join('\u001f');
}

export function buildClientSubmitFingerprint(input: SystemLogInput) {
  return [
    input.level,
    input.source,
    input.consoleMethod,
    input.message,
    input.page,
    input.platform,
    input.errorName ?? '',
    input.feature ?? '',
    input.operation ?? '',
    input.sourceFile ?? '',
    input.sourceLine ?? '',
    input.correlationId ?? '',
  ].join('\u001f');
}
