let counter = 0;

export function nextSellerId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
