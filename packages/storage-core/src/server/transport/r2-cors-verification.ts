import type { R2CorsRule } from './r2-cors-policy';

function normalizeStrings(values: readonly string[] | undefined, lowerCase = false): string[] {
  return (values ?? [])
    .map((value) => lowerCase ? value.trim().toLowerCase() : value.trim())
    .filter(Boolean)
    .sort();
}

function normalizeRule(rule: R2CorsRule) {
  return {
    id: rule.id?.trim() ?? '',
    origins: normalizeStrings(rule.allowed.origins),
    methods: normalizeStrings(rule.allowed.methods.map((method) => method.toUpperCase())),
    headers: normalizeStrings(rule.allowed.headers, true),
    exposeHeaders: normalizeStrings(rule.exposeHeaders, true),
    maxAgeSeconds: rule.maxAgeSeconds ?? 0,
  };
}

export function normalizeR2CorsRules(rules: readonly R2CorsRule[]): ReturnType<typeof normalizeRule>[] {
  return rules.map(normalizeRule).sort((left, right) => left.id.localeCompare(right.id));
}

export function r2CorsRulesMatch(expected: readonly R2CorsRule[], actual: readonly R2CorsRule[]): boolean {
  return JSON.stringify(normalizeR2CorsRules(expected)) === JSON.stringify(normalizeR2CorsRules(actual));
}
