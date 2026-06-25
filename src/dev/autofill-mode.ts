/** True when `?autofill=1` is present (dev autofill for onboarding forms). */
export function isAutofillMode(query: string): boolean {
  return new URLSearchParams(query.startsWith('?') ? query.slice(1) : query).get('autofill') === '1';
}
