export function minorCurrencyToInputValue(value: number): string {
  return value === 0 ? "" : String(value / 100);
}

export function majorCurrencyInputToMinor(value: string): number {
  return Math.max(0, Math.round((Number(value) || 0) * 100));
}
