/**
 * Error code → HTTP status, as data.
 *
 * Every service mirror re-implemented this as a nested ternary, and each one was written to
 * "match the main app" by eye. A client must not be able to tell which deployment answered, so
 * the *mechanism* is held once and only the rules — which are genuinely per-route policy — stay
 * with the route that owns them.
 *
 * Rules are evaluated in order and the first match wins, which is what makes a specific code
 * beatable by a broad `includes` rule placed after it rather than before.
 */
export interface ErrorStatusRule {
  status: number;
  /** Exact message match. */
  equals?: readonly string[];
  /** Substring match, case-sensitive — the form the mirrors already used. */
  includes?: readonly string[];
  /** Anything the two above cannot express. */
  matches?: RegExp;
}

export const INTERNAL_SERVER_ERROR = 'Internal Server Error';

/** The message a thrown value carries, with the same fallback every mirror used. */
export function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : INTERNAL_SERVER_ERROR;
}

export function mapErrorStatus(
  message: string,
  rules: readonly ErrorStatusRule[],
  fallback = 500,
): number {
  for (const rule of rules) {
    if (rule.equals?.includes(message)) return rule.status;
    if (rule.includes?.some((token) => message.includes(token))) return rule.status;
    if (rule.matches?.test(message)) return rule.status;
  }
  return fallback;
}
