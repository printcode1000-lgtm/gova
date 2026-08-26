const UI_TOKEN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

/** True when the value is lowercase dot/dash-separated UI metadata. */
export function isUiToken(value: unknown): value is string {
  return typeof value === "string" && UI_TOKEN.test(value);
}

/** Rejects any value that is not lowercase dot/dash-separated UI metadata. */
export function assertUiToken(value: string, label: string): string {
  if (!isUiToken(value)) {
    throw new Error(`${label} must be lowercase dot/dash-separated UI metadata.`);
  }
  return value;
}
