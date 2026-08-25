/** Pure policy for the active GitHub rules that apply to `main`. */

export interface GitHubBranchRule {
  readonly type?: string;
}

const NON_BLOCKING_MAIN_RULE_TYPES = new Set(['creation', 'deletion']);

/**
 * Creation cannot affect an existing `main`, and deletion does not delay an
 * ordinary update. Every other active rule can reject or delay a direct push.
 */
export function blockingMainRules(
  rules: readonly GitHubBranchRule[],
): GitHubBranchRule[] {
  return rules.filter(
    (rule) => !rule.type || !NON_BLOCKING_MAIN_RULE_TYPES.has(rule.type),
  );
}

export function describeMainRules(rules: readonly GitHubBranchRule[]): string {
  return rules.map((rule) => rule.type?.trim() || 'unknown').join(', ');
}
